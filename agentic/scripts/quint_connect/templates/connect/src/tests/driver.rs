use std::{
    collections::{BTreeMap, HashMap},
    panic::AssertUnwindSafe,
};
use quint_connect::{Driver as QuintDriver, *};
use pretty_assertions::assert_eq;

// TODO: add implementation type imports

use crate::tests::{state::*, transition::*, types::*};

pub struct ${driver_name} {
    processes: AssertUnwindSafe<HashMap<String, ${impl_type}>>,
}

impl ${driver_name} {
    pub fn new() -> Self {
        Self {
            processes: AssertUnwindSafe::default()
        }
    }
}

impl QuintDriver for ${driver_name} {
    fn nondet_picks<'a>(&'a self, step: &'a Step) -> NondetPicks<'a> {
        nondet_picks(step)
    }

    fn action_taken(&self, step: &Step) -> Option<String> {
        self.nondet_picks(step).get("action")
    }

    fn step(&mut self, step: &Step) -> Status {
        switch! {
            (self, step) {
                init,
            }
        }
    }

    fn check(&self, step: &Step) {
        let spec_states: BTreeMap<String, SpecState> = step
            .get_in(&["tendermint5f::choreo::s", "system"])
            .expect("missing spec state");

        for (process, driver) in self.processes.iter() {
            let spec_state = spec_states.get(process).expect("unkown process");
            let impl_state = driver.into();

            assert_eq!(
                *spec_state, impl_state,
                "spec and implementation states diverged for process {}",
                process
            );
        }
    }
}

impl ${driver_name} {
    fn init(&mut self) {
        for process_id in ["p1", "p2", "p3", "p4", "p5", "p6"] {
            // TODO: initialize ${impl_type} and insert into self.processes
        }
    }
}
