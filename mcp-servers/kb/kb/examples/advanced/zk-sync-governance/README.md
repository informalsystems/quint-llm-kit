# ZKsync Governance's Quint Specification

This repository contains an executable specification and core invariants of the ZKsync governance protocol using [Quint](https://github.com/informalsystems/quint).
More technical details can be found in our [blogpost](https://protocols-made-fun.com/zksync/matterlabs/quint/specification/modelchecking/2024/09/12/zksync-governance.html).

## Getting Started

Once all the [dependencies](https://quint-lang.org/docs/getting-started) are installed, you can run sanity tests:
```
make test
```

## Evaluation

To evaluate the invariants against the specification, you can use the following techniques the Quint tools offer:

Random simulation:

```
quint run --invariant=strictFreezeAllowedOpsInv --max-steps=1 main.qnt
```

Randomized symbolic execution:

```
quint verify --random-transitions=true --invariant=strictFreezeAllowedOpsInv --max-steps=1 main.qnt
```

Bounded model checking:
```
quint verify --invariant=strictFreezeAllowedOpsInv --max-steps=1 main.qnt
```
`max-steps` should be adjusted according to your goals and computational resources
