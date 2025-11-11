mod driver;
mod state;
mod transition;
mod types;

use driver::${driver_name};
use quint_connect::{Driver, quint_test};

#[quint_test(
    spec = "${spec_path}",
    test = "${test_name}",
    main = "${main_module}",
    max_samples = 1
)]
fn ${rust_test_name}() -> impl Driver {
    ${driver_name}::new()
}
