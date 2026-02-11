# Foundry Support

This document covers how to use the optional Foundry toolchain integration for Solidity development.

## What is Foundry?

Foundry is a blazing fast, portable, and modular toolkit for Ethereum application development. It includes:
- **forge**: Ethereum testing framework
- **cast**: Swiss army knife for interacting with EVM smart contracts
- **anvil**: Local Ethereum node
- **chisel**: Fast, utilitarian, and verbose Solidity REPL

## Building with Foundry Support

By default, Foundry is **not** included in the Docker image to keep it lightweight. If you're working with Solidity contracts (like the examples in `mcp-servers/kb/kb/examples/solidity/`), you can include Foundry tools during the build:

```bash
# Option 1: Using the convenience target
make build-foundry

# Option 2: Passing build args explicitly
docker build --build-arg INSTALL_FOUNDRY=true -t claudecode:latest -f claudecode.dockerfile .
```

This installs the complete Foundry toolchain: forge, cast, anvil, and chisel.

## Verifying Installation

To verify Foundry installation inside the container:

```bash
make shell
forge --version
cast --version
anvil --version
chisel --version
```

## Use Cases

Include Foundry when you need to:
- Develop or test Solidity smart contracts
- Interact with Ethereum networks
- Run local blockchain simulations
- Work with the Solidity examples in this repository

## Resources

- [Foundry Book](https://book.getfoundry.sh/) - Official documentation
- [Foundry GitHub](https://github.com/foundry-rs/foundry) - Source code and issues
