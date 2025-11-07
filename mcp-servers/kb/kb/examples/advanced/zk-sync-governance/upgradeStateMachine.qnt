module upgradeStateMachine {
    import hashing.* from "./hashing"
    import types.* from "./types"
    import state.* from "./state"
    import protocolUpgradeHandler.* from "./protocolUpgradeHandler"

    pure val SECURITY_COUNCIL_MEMBERS = Set("sc1", "sc2", "sc3", "sc4", "sc5", "sc6", "sc7", "sc8", "sc9", "sc10", "sc11", "sc12")
    pure val GUARDIAN_MEMBERS = Set("g1", "g2", "g3", "g4", "g5", "g6", "g7", "g8")
    pure val ZK_FOUNDATION_MEMBERS = Set("zkf1", "zkf2", "zkf3", "zkf4", "zkf5", "zkf6", "zkf7", "zkf8")
    pure val NON_MEMBERS = Set("nobody1", "nobody2", "nobody3", ZERO_ADDRESS)
    pure val ALL_SENDERS = Set(SECURITY_COUNCIL_ADDR, PROTOCOL_UPGRADE_HANDLER_ADDR, GUARDIANS_ADDR, EMERGENCY_UPGRADE_BOARD_ADDR, ANY_ADDRESS)
    pure val ALL_MEMBERS = SECURITY_COUNCIL_MEMBERS.union(GUARDIAN_MEMBERS).union(ZK_FOUNDATION_MEMBERS).union(NON_MEMBERS);
    pure val ALL_ADDRESSES = ALL_SENDERS
    pure val CALLS = Set("call1")
    pure val SALTS = Set("salt1")
    pure val TIMESTAMPS = 0.to(10000)

    var state: ProtocolUpgradeHandlerState
    var blockTimestamp: Uint256
    var upgradeStateHistory: AbiElem -> List[UpgradeState]

    action init = all {
        state' = {
            securityCouncil: SECURITY_COUNCIL_ADDR,
            guardians: GUARDIANS_ADDR,
            emergencyUpgradeBoard: EMERGENCY_UPGRADE_BOARD_ADDR,
            upgradeStatus: Map(),
            lastFreezeStatusInUpgradeCycle: FreezeStatusNone,
            protocolFrozenUntil: 0,
        },
        blockTimestamp' = 0,
        upgradeStateHistory' = Map(),
    }

    action update = all {
        nondet sender = oneOf(ALL_SENDERS)
        nondet calls = oneOf(CALLS)
        nondet executor = oneOf(ALL_ADDRESSES)
        nondet salt = oneOf(SALTS)
        val proposal = { calls: calls, executor: executor, salt: salt }
        val proposalId = keccak256_UpgradeProposal(proposal)
        nondet creationTimestamp = TIMESTAMPS.oneOf()
        nondet securityCouncilApprovalTimestamp = TIMESTAMPS.oneOf()
        nondet guardiansApproval = Bool.oneOf()
        nondet guardiansExtendedLegalVeto = Bool.oneOf()
        nondet executed = Bool.oneOf()
        val upgradeStatus = {
            creationTimestamp: creationTimestamp,
            securityCouncilApprovalTimestamp: securityCouncilApprovalTimestamp,
            guardiansApproval: guardiansApproval,
            guardiansExtendedLegalVeto: guardiansExtendedLegalVeto,
            executed: executed,
        }
        nondet nextBlockTimestamp = TIMESTAMPS.oneOf()
        all {
            nextBlockTimestamp >= blockTimestamp,
            state' = {
                ...state,
                upgradeStatus: state.upgradeStatus.put(proposalId, upgradeStatus),
            },
            blockTimestamp' = nextBlockTimestamp,
            upgradeStateHistory' = upgradeStateHistory.put(proposalId, [ ]),
        }
    }

    action call = all {
        nondet sender = oneOf(ALL_SENDERS)
        nondet calls = oneOf(CALLS)
        nondet executor = oneOf(ALL_ADDRESSES)
        nondet salt = oneOf(SALTS)
        val proposal = { calls: calls, executor: executor, salt: salt }
        val proposalId = keccak256_UpgradeProposal(proposal)
        val upg = upgradeState(state, blockTimestamp, proposalId)
        all {
            upgradeStateHistory' = upgradeStateHistory.setBy(proposalId, old => old.append(upg)),
            blockTimestamp' = blockTimestamp,
            state' = state,
        }
    }

    action step = any {
        update,
        call
    }

    val transitionInv = state.upgradeStatus.keys().forall(proposalId => {
        val history = upgradeStateHistory.get(proposalId)
        history.indices().forall(i => or {
            i == history.length() - 1,
            or {
                // Enabled:
                history[i] == UpgradeStateNone and history[i + 1] == UpgradeStateNone,
                history[i] == UpgradeStateNone and history[i + 1] == UpgradeStateLegalVetoPeriod,
                history[i] == UpgradeStateLegalVetoPeriod and history[i + 1] == UpgradeStateLegalVetoPeriod,
                history[i] == UpgradeStateWaiting and history[i + 1] == UpgradeStateWaiting,
                history[i] == UpgradeStateWaiting and history[i + 1] == UpgradeStateExecutionPending,
                history[i] == UpgradeStateReady and history[i + 1] == UpgradeStateDone,
                // Not-enabled. That means that according to the allowedUpgradeOps invariabt,
                // there no implelemnted methods in the zk-governance that can transfer the contracts from one state to another,
                // but those methods exist in theory.
                // 
                history[i] == UpgradeStateExecutionPending and history[i + 1] == UpgradeStateExecutionPending,
                history[i] == UpgradeStateExecutionPending and history[i + 1] == UpgradeStateReady,
                history[i] == UpgradeStateLegalVetoPeriod and history[i + 1] == UpgradeStateExecutionPending,
                history[i] == UpgradeStateLegalVetoPeriod and history[i + 1] == UpgradeStateReady,
                history[i] == UpgradeStateReady and history[i + 1] == UpgradeStateReady,
                history[i] == UpgradeStateExpired and history[i + 1] == UpgradeStateExpired,
                history[i] == UpgradeStateLegalVetoPeriod and history[i + 1] == UpgradeStateExpired,
                history[i] == UpgradeStateLegalVetoPeriod and history[i + 1] == UpgradeStateWaiting,
                history[i] == UpgradeStateWaiting and history[i + 1] == UpgradeStateExpired,
                history[i] == UpgradeStateWaiting and history[i + 1] == UpgradeStateReady,
                history[i] == UpgradeStateDone and history[i + 1] == UpgradeStateDone,
            }
        })
    })

    // falsy invariants
    val upgradeStateLegalVetoPeriodExample = not(
        // an example in 2 steps
        state.upgradeStatus.keys().exists(proposalId => {
            val history = upgradeStateHistory.get(proposalId)
            history.indices().exists(i => history[i] == UpgradeStateLegalVetoPeriod)
        })
    )

    val upgradeStateExecutionPendingExample = not(
        // an example in 2 steps
        state.upgradeStatus.keys().exists(proposalId => {
            val history = upgradeStateHistory.get(proposalId)
            history.indices().exists(i => history[i] == UpgradeStateExecutionPending)
        })
    )

    val upgradeStateReadyExample = not(
        // an example in 2 steps
        state.upgradeStatus.keys().exists(proposalId => {
            val history = upgradeStateHistory.get(proposalId)
            history.indices().exists(i => history[i] == UpgradeStateReady)
        })
    )

    val upgradeStateDoneExample = not(
        // an example in 2 steps
        state.upgradeStatus.keys().exists(proposalId => {
            val history = upgradeStateHistory.get(proposalId)
            history.indices().exists(i => history[i] == UpgradeStateDone)
        })
    )

    val upgradeStateWaitingExample = not(
        // an example in 2 steps
        state.upgradeStatus.keys().exists(proposalId => {
            val history = upgradeStateHistory.get(proposalId)
            history.indices().exists(i => history[i] == UpgradeStateWaiting)
        })
    )

    val upgradeStateExpiredExample = not(
        // an example in 2 steps
        state.upgradeStatus.keys().exists(proposalId => {
            val history = upgradeStateHistory.get(proposalId)
            history.indices().exists(i => history[i] == UpgradeStateExpired)
        })
    )
}