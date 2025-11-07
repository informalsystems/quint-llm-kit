# Mysticeti Consensus - Quint specification

This repository contains an unofficial Quint specification for the Mysticeti-C
consensus algorithm based on its [paper](https://arxiv.org/pdf/2310.14821) and
public talks. This was written as an exercise and should not be used to inform
production-level usage of the protocol. It can be a valuable artifact if you are
trying to learn it.

Check out the blog post we wrote about this work: [Understanding 
Mysticeti Consensus with Quint](https://informal.systems/blog/understanding-mysticeti-consensus-with-quint-2025).

## Files

Main files:
- `mysticeti_c.qnt` has the core functionality of the algorithm
- `dag_evolution.qnt` describes a state machine for how a DAG can evolve over
  time, including byzantine behavior. This can be re-used for other DAG-based
  specifications.
- `main.qnt` connects the two modules above so all nodes try to run `decide_all`
  at every state while the DAG evolves, and defines properties over the
  outcomes.

Other files:
- `mysticeti_paper_test.qnt` uses `mysticeti_c.qnt` to reproduce the sequence of
  decision steps describe by Appendix A on the paper. Serves as evidence that
  our algorithm specification matches the paper.
- `mysticeti_types.qnt` defines the main data structures used for consensus
- `watcher.qnt` implements some logging/tracing-like functionality to enable
  observing inner parts of the algorithm

## Visualizer

The folder [`visualizer`](./visualizer) contains a simple Rust project that
parses an ITF trace generated from this model and renders it in an interactive
visualization of the DAG with information about each decision that was taken.
This can be a valuable asset to understand the decision process, and it was
useful to find issues with the model that are currently fixed. The following
video is a visualization of the example from the paper:

<video autoPlay
src="https://github.com/user-attachments/assets/077a8965-5f1c-4121-8c7d-6ad49e59c260"></video>





To reproduce it, go to the root of this repo and run:

``` sh
quint test mysticeti_paper_test.qnt --match=paperTest --out-itf=out.itf.json
```

This will create an `out.itf.json` file on the root folder, which will be used
by the visualizer.

Now `cd visualizer` and `cargo run`.

You can then use the left/right arrow keys to move backwards/forwards into the
decisions.

> [!NOTE]
> The visualization tool was written to visualize DAGs similar to the ones in
> this example, and would need further development to work as a general
> visualizer for any DAG size.

## TODO
- [ ] Model equivocation
- [x] Elect different leaders for different rounds
- [ ] Consider subsets of leaders (we only consider all validators being leaders
      with different ranks)
- [ ] Optimize `decide_all` so it doesn't run all the way to round 0 every time
- [ ] Define invariants from Lemmas 1-6
