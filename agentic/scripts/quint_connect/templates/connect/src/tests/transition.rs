use quint_connect::{NondetBuilder, NondetPicks, Step};
use serde::Deserialize;

use crate::tests::types::*;

#[derive(Deserialize, Debug)]
struct Transition {
    label: TransitionLabel,
}

pub fn nondet_picks<'a>(step: &'a Step) -> NondetPicks<'a> {
    let nondet = NondetPicks::from(step).expect("missing nondet picks");
    let mut builder = NondetBuilder::default();

    if let Some(process) = nondet.get::<String>("process") {
        builder = builder.insert("process", process);
    }

    let label = nondet.get("transition").map(|t: Transition| t.label);

    builder = match label {
        None => builder.insert("action", "init"),
        // TODO: add missing transitions
    };

    builder.build()
}
