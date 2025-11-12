#!/usr/bin/env python3

import json
import os
import re
import subprocess
import sys

from string import Template
from tempfile import NamedTemporaryFile
from dataclasses import dataclass
from typing import List, Optional

TEMPLATES_DIR = f'{os.path.dirname(__file__)}/templates/connect'

# Arguments
spec_path = None
main_module = None
test_name = None
crate_dir = None
crate_name = None
driver_name = None
impl_type = None

# Derived types
SCALARS = {'str': 'String', 'int': 'i64'}
types = {}

# Rust type repr
@dataclass
class Unresolved:
    name: str

@dataclass
class TypeAlias:
    name: str
    tpe: str

    def to_rust(self):
        return f'pub type {self.name} = {self.tpe};'

@dataclass
class Variant:
    name: str
    tpe: Optional[str]
    has_content: bool

    def to_rust(self):
        repr = f'{self.name}'
        if self.tpe:
            repr += f'({self.tpe})'
        return repr
    
@dataclass
class Enum:
    name: str
    variants: List[Variant]

    def to_rust(self):
        repr = "#[derive(Eq, PartialEq, Serialize, Deserialize, Clone, Debug)]\n"
        if self.has_content():
            repr += '#[serde(tag = "tag", content = "value")]\n'
        else:
            repr += '#[serde(tag = "tag")]\n'
        repr += f'pub enum {self.name} {{\n'
        for var in self.variants:
            repr += f'    {var.to_rust()},\n'
        repr += '}'
        return repr

    def has_content(self):
        for var in self.variants:
            if var.has_content:
                return True
        return False

@dataclass
class Field:
    name: str
    tpe: str
    ann: Optional[str]

    def to_rust(self):
        repr = ""
        if self.ann:
            repr += f'{self.ann}\n    '
        repr += f'pub {self.name}: {self.tpe}'
        return repr
    
@dataclass
class Struct:
    name: str
    fields: List[Field]

    def to_rust(self):
        repr = "#[derive(Eq, PartialEq, Serialize, Deserialize, Clone, Debug)]\n"
        repr += f'pub struct {self.name} {{\n'
        for field in self.fields:
            repr += f'    {field.to_rust()},\n'
        repr += '}'
        return repr

def main():
    global spec_path, main_module, test_name, crate_dir, crate_name, driver_name, impl_type

    if len(sys.argv) < 8:
        print('Usage: python3 project_scaffold.py <spec_path> <main_module> <test_name> <crate_dir> <crate_name> <driver_name> <impl_type>')
        print('Example: python3 project_scaffold.py spec/tendermint5f/tendermint5f.qnt valid basicTest code/crates/test/mbt informalsystems-malachitebft-test-mbt Tendermint5fDriver "Driver<TestContext>"')
        sys.exit(1)

    spec_path = sys.argv[1]
    main_module = sys.argv[2]
    test_name = sys.argv[3]
    crate_dir = sys.argv[4]
    crate_name = sys.argv[5]
    driver_name = sys.argv[6]
    impl_type = sys.argv[7]

    print('=' * 60)
    print('Creating MBT crate scaffold')
    print('=' * 60)
    print(f'Spec path: {spec_path}')
    print(f'Main module: {main_module}')
    print(f'Test name: {test_name}')
    print(f'Crate dir: {crate_dir}')
    print(f'Crate name: {crate_name}')
    print(f'Driver name: {driver_name}')
    print(f'Impl. type: {impl_type}')
    print()

    extract_common_types()
    create_crate()

    print()
    print('DONE! MBT crate created successfully.')


def create_crate():
    create_cargo_file()
    create_lib_file()
    create_tests_file()
    create_driver_file()
    create_state_file()
    create_transition_file()
    create_types_file()
    create_specs_dir()

def create_cargo_file():
    write_template(
        'Cargo.toml',
        spec_name=os.path.basename(spec_path)
    )

def create_lib_file():
    write_template('src/lib.rs')

def create_tests_file():
    write_template(
        'src/tests.rs',
        spec_path=f'specs/{os.path.basename(spec_path)}',
        rust_test_name=re.sub(r'([a-z])([A-Z])', r'\1_\2', test_name).lower()
    )

def create_driver_file():
    write_template('src/tests/driver.rs')

def create_state_file():
    write_template('src/tests/state.rs')

def create_transition_file():
    write_template('src/tests/transition.rs')

def create_types_file():
    write_template(
        'src/tests/types.rs',
        spec_name=os.path.basename(spec_path),
        rust_types='\n\n'.join([tpe.to_rust() for tpe in types.values()]),
    )

def create_specs_dir():
    src = os.path.dirname(spec_path)
    src = os.path.relpath(src, crate_dir)
    dst = f'{crate_dir}/specs'
    print(f'Creating symbolic link from {src} to {dst} ...')
    os.symlink(src, dst, target_is_directory=True)

def write_template(path, **kwargs):
    src_path = f'{TEMPLATES_DIR}/{path}'
    dest_path = f'{crate_dir}/{path}'
    print(f'Creating file {dest_path} ...')

    # make globals available
    args = {
        'spec_path': spec_path,
        'main_module': main_module,
        'test_name': test_name,
        'crate_dir': crate_dir,
        'crate_name': crate_name,
        'driver_name': driver_name,
        'impl_type': impl_type
    }

    # extra template values
    for key, val in kwargs.items():
        args[key] = val
    
    with open(src_path, 'r') as f:
        src = Template(f.read())
        
    os.makedirs(os.path.dirname(dest_path), 0o777, True)
    with open(dest_path, 'w') as f:
        f.write(src.substitute(args))

def extract_common_types():
    with NamedTemporaryFile(mode='w+', delete=True) as tmp:
        output = subprocess.run(
            ['quint', 'compile', '--flatten', 'false', spec_path],
            check=True,
            text=True,
            stdout=tmp
        )
        tmp.seek(0)
        js = json.load(tmp)

    derive_state(js)
    derive_messages(js)
    derive_transitions(js)
    derive_unresolved_types(js)

def derive_state(js):
    for module in js['modules']:
        for decl in module['declarations']:
            if decl.get('name') == 'StateFields':
                struct = derive_struct(js, decl)
                struct.name = 'SpecState'
                types['StateFields'] = struct
                return

    print('Could not locate type StateFields in the spec', file=sys.stderr)
    sys.exit(1)

def derive_messages(js):
    for module in js['modules']:
        for decl in module['declarations']:
            if decl.get('name', '').endswith('Msg'):
                struct = derive_struct(js, decl)
                types[struct.name] = struct

def derive_struct(js, decl):
    struct_name = decl['name']
    decl_fields = decl['type']['fields']['fields']
    struct_fields = [derive_struct_field(js, field) for field in decl_fields]
    return Struct(struct_name, struct_fields)

def derive_struct_field(js, field):
    field_name = field['fieldName']
    field_type = derive_field_type(js, field['fieldType'])
    field_ann = '#[serde(with = "As::<de::Option<_>>")]' if field_type.startswith('Option') else None
    return Field(field_name, field_type, field_ann)

def derive_field_type(js, tpe):
    match tpe['kind']:
        case kind if kind in SCALARS:
            return SCALARS[kind]

        case 'set':
            inner = derive_field_type(js, tpe['elem'])
            return f'Vec<{inner}>'

        case 'fun':
            key = derive_field_type(js, tpe['arg'])
            val = derive_field_type(js, tpe['res'])
            return f'BTreeMap<{key}, {val}>'
        
        case 'const':
            name = tpe['name']
            if not name in types:
                types[name] = Unresolved(name)
            return name

        case 'sum':
            # Special case: is it a Option?
            if tpe['fields']['kind'] == 'row' and \
               tpe['fields']['fields'][0]['fieldName'] == 'Some':
                inner = derive_field_type(js, tpe['fields']['fields'][0]['fieldType'])
                return f'Option<{inner}>'

        case 'rec':
            for module in js['modules']:
                for decl in module['declarations']:
                    if decl['kind'] == 'typedef' and \
                       decl['type']['id'] == tpe['id']:
                        name = decl['name']
                        if not name in types:
                            types[name] = Unresolved(name)
                        return name
            
    print(f'Failed to derive type for: {tpe}', file=sys.stderr)
    sys.exit(1)

def derive_transitions(js):
    for module in js['modules']:
        for decl in module['declarations']:
            if decl.get('name') == 'TransitionLabel':
                enum = derive_enum(js, decl)
                types[enum.name] = enum

def derive_unresolved_types(js):
    while True:
        unresolved = False
        for (name, tpe) in types.items():
            if isinstance(tpe, Unresolved):
                derive_unresolved_type(js, tpe)
                unresolved = True
        if not unresolved:
            break

def derive_unresolved_type(js, tpe):
    for module in js['modules']:
        for decl in module['declarations']:
            if decl['kind'] == 'typedef' and \
               decl['name'] == tpe.name:
                types[tpe.name] = derive_type_decl(js, decl)
                return

    print(f'Failed to resolve type {tpe.name}', file=sys.stderr)
    sys.exit(1)

def derive_type_decl(js, decl):
    match decl['type']['kind']:
        case 'sum': return derive_enum(js, decl)
        case 'rec': return derive_struct(js, decl)
        case kind if kind in SCALARS:
            return TypeAlias(decl['name'], SCALARS[kind])

    print(f'Can NOT derive type declaration for {decl}', file=sys.stderr)
    sys.exit(1)

def derive_enum(js, decl):
    name = decl['name']
    vars = decl['type']['fields']['fields']
    variants = [derive_variant(js, var) for var in vars]
    return Enum(name, variants)

def derive_variant(js, var):
    name = var['fieldName']

    match var['fieldType']['kind']:
        case 'tup':
            return Variant(name, None, False)
        case 'rec':
            # special case: enums allow for nested fields
            decl_fields = var['fieldType']['fields']['fields']
            if 'fieldName' in decl_fields[0]:
                struct_name = f'{name}Args'
                struct_fields = [derive_struct_field(js, field) for field in decl_fields]
                types[struct_name] = Struct(struct_name, struct_fields)
                return Variant(name, struct_name, True)
            else:
                tpe = derive_field_type(js, var['fieldType'])
                return Variant(name, tpe, True)
        case _:
            tpe = derive_field_type(js, var['fieldType'])
            return Variant(name, tpe, True)
                
if __name__ == '__main__':
    main()
