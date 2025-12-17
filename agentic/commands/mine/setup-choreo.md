---
command: /mine:setup-choreo
description: Download Choreo framework files for writing distributed protocol specifications
version: 1.0.0
---

# Setup Choreo Framework

## Objective

Download the Choreo framework and Spells files from GitHub to enable writing distributed protocol specifications using Choreo's structured approach with message passing, listeners, and effects.

## File Operation Constraints

**CRITICAL**: Choreo files MUST be written within workspace.
- NEVER use `/tmp` or system temp directories
- Default: `specs/choreo/` directory in the workspace
- Downloads: `choreo.qnt`, `template.qnt`, `spells/basicSpells.qnt`, `spells/rareSpells.qnt`

## Quint Language Constraints

**CRITICAL**: When working with Quint/Choreo code, respect language limitations from `.claude/guidelines/quint-constraints.md`:
- **No string manipulation**: Strings are opaque values (no concat, interpolation, or conversion)
- **No nested pattern matching**: Match one level at a time
- **No destructuring**: Use explicit field access (`.field`, `._1`, `._2`)
- **No loops**: Use recursion or set operations
- Additional constraints apply (see guidelines file)

## Input Contract

### Required Parameters
None - command downloads from public GitHub repository

### Optional Parameters
- `output_dir`: Directory to download Choreo files (default: `specs/choreo`)
- `branch`: Git branch to download from (default: `main`)

## Output Contract

### Success
```
✅ Choreo framework installed successfully!

Installation directory: specs/choreo/

Files downloaded:
  • choreo.qnt            (Core framework)
  • template.qnt          (Starter template)
  • spells/basicSpells.qnt  (Basic utilities)
  • spells/rareSpells.qnt   (Advanced utilities)

Choreo is ready to use!

To use Choreo in your specs:
  import basicSpells.* from "choreo/spells/basicSpells"
  import choreo(processes = NODES) as choreo from "choreo/choreo"

Next steps:
  1. Run /mine:start to create a Choreo-based specification
  2. Or copy specs/choreo/template.qnt as a starting point
  3. See examples: https://github.com/informalsystems/choreo/tree/main/examples
```

### Failure
```
❌ Failed to download Choreo framework

Error: Could not download choreo.qnt from GitHub
Phase: Download

Please check your internet connection and try again.
```

## Execution Procedure

### Phase 1: Setup Output Directory

**Objective**: Prepare directory structure for Choreo files.

**Steps**:

1. **Determine Output Directory**
   - If `output_dir` provided: Use it
   - Else: Use `specs/choreo`
   - Store: Full output path

2. **Check if Already Installed**
   - Check: File exists at `{output_dir}/choreo.qnt`
   - If exists:
     - Ask user: "Choreo already installed. Reinstall? (yes/no)"
     - If no: Exit with message "Choreo already installed"
     - If yes: Continue (will overwrite)

3. **Create Directory Structure**
   - Run: `mkdir -p {output_dir}/spells`
   - Verify: Directories created successfully
   - If fails: Return error "Could not create directory"

### Phase 2: Download Core Framework Files

**Objective**: Download main Choreo files from GitHub.

**Steps**:

4. **Download choreo.qnt**
   - URL: `https://raw.githubusercontent.com/informalsystems/choreo/{branch}/choreo.qnt`
   - Command: `curl -fsSL {url} -o {output_dir}/choreo.qnt`
   - Check: File downloaded and non-empty
   - If fails: Return error "Could not download choreo.qnt"

5. **Download template.qnt**
   - URL: `https://raw.githubusercontent.com/informalsystems/choreo/{branch}/template.qnt`
   - Command: `curl -fsSL {url} -o {output_dir}/template.qnt`
   - Check: File downloaded and non-empty
   - If fails: Return error "Could not download template.qnt"

### Phase 3: Download Spells Files

**Objective**: Download utility modules.

**Steps**:

6. **Download basicSpells.qnt**
   - URL: `https://raw.githubusercontent.com/informalsystems/choreo/{branch}/spells/basicSpells.qnt`
   - Command: `curl -fsSL {url} -o {output_dir}/spells/basicSpells.qnt`
   - Check: File downloaded and non-empty
   - If fails: Return error "Could not download basicSpells.qnt"

7. **Download rareSpells.qnt**
   - URL: `https://raw.githubusercontent.com/informalsystems/choreo/{branch}/spells/rareSpells.qnt`
   - Command: `curl -fsSL {url} -o {output_dir}/spells/rareSpells.qnt`
   - Check: File downloaded and non-empty
   - If fails: Return error "Could not download rareSpells.qnt"

### Phase 4: Validation

**Objective**: Verify downloaded files are valid Quint.

**Steps**:

8. **Parse Choreo.qnt**
   - Run: `quint parse {output_dir}/choreo.qnt`
   - Check: No parse errors
   - If fails: Warn "choreo.qnt may have issues, but installation complete"

9. **Parse Template.qnt**
   - Run: `quint parse {output_dir}/template.qnt`
   - Check: No parse errors
   - If fails: Warn "template.qnt may have issues, but installation complete"

10. **Verify File Sizes**
    - Per downloaded file:
      - Check: File size > 100 bytes
      - If any file too small: Warn "Some files may be incomplete"

### Phase 5: Output and Guidance

**Objective**: Inform user and provide next steps.

**Steps**:

11. **Count Downloaded Files**
    - List: All .qnt files in output_dir
    - Count: Should be 4 files total
    - Store: File list with sizes

12. **Generate Import Examples**
    - Calculate relative path from `specs/` to Choreo files
    - Generate proper import statements:
      ```quint
      import basicSpells.* from "{relative_path}/spells/basicSpells"
      import choreo(processes = NODES) as choreo from "{relative_path}/choreo"
      ```

13. **Display Success Message**
    - Show: All downloaded files with indicators
    - Show: Proper import statements
    - Show: Next steps and links
    - Include: Link to Choreo documentation and examples

## Tools Used

- `Bash`: Create directories and download files with curl
- `Read`: Check if files already exist
- `Write`: Not needed (files downloaded directly)
- `Grep`: Check file contents for verification (optional)

## Error Handling

### Network Error
- **Condition**: Cannot reach GitHub (curl fails)
- **Action**: Return error "Network error downloading from GitHub"
- **Recovery**: User checks connection and retries

### Permission Error
- **Condition**: Cannot create directory or write files
- **Action**: Return error "Permission denied creating {path}"
- **Recovery**: User checks workspace permissions

### Invalid Branch
- **Condition**: Specified branch doesn't exist
- **Action**: Return error "Branch '{branch}' not found"
- **Recovery**: User specifies valid branch (usually 'main')

### Partial Download
- **Condition**: Some files downloaded, others failed
- **Action**: List which files succeeded/failed, return error
- **Recovery**: User retries, system will overwrite incomplete files

### Parse Errors (Non-fatal)
- **Condition**: Downloaded files don't parse correctly
- **Action**: Show warning but complete installation
- **Recovery**: Files might be from incompatible Quint version, user can update manually

## Example Execution

**Input**:
```
/mine:setup-choreo
```

**Process**:
1. Check if `specs/choreo/choreo.qnt` exists → Not found
2. Create `specs/choreo/` and `specs/choreo/spells/`
3. Download choreo.qnt (32 KB) ✓
4. Download template.qnt (8 KB) ✓
5. Download spells/basicSpells.qnt (12 KB) ✓
6. Download spells/rareSpells.qnt (6 KB) ✓
7. Parse choreo.qnt → Valid ✓
8. Parse template.qnt → Valid ✓

**Output**:
```
✅ Choreo framework installed successfully!

Installation directory: specs/choreo/

Files downloaded:
  • choreo.qnt            (32 KB - Core framework)
  • template.qnt          (8 KB - Starter template)
  • spells/basicSpells.qnt  (12 KB - Basic utilities)
  • spells/rareSpells.qnt   (6 KB - Advanced utilities)

Choreo is ready to use!

To use Choreo in your specs:
  import basicSpells.* from "choreo/spells/basicSpells"
  import choreo(processes = NODES) as choreo from "choreo/choreo"

Next steps:
  1. Run /mine:start to create a Choreo-based specification
  2. Or copy specs/choreo/template.qnt as a starting point
  3. See examples: https://github.com/informalsystems/choreo/tree/main/examples

Documentation: https://quint-lang.org/choreo
```

## Quality Standards

**Checklist**:
- [ ] All 4 files downloaded successfully
- [ ] Directory structure created correctly
- [ ] Files are valid Quint (pass parse check)
- [ ] Import paths are correct relative to specs/
- [ ] User informed about next steps
- [ ] Links to documentation provided

## Notes

- Downloads from official Choreo GitHub repository (Apache 2.0 license)
- Files are small (~60 KB total) and download quickly
- Choreo requires compatible Quint version (already installed in container)
- Template.qnt is a good starting point for learning Choreo patterns
- User can manually edit downloaded files if needed
- Re-running command will offer to reinstall (overwrite)
