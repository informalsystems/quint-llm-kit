module types {

    type Address = str
    type ChainID = int
    type Uint256 = int
    type Uint64 = int
    type Uint48 = int
    type Uint16 = int
    type Uint = int
    type Bytes = str
    type Bytes4 = str
    type Bytes32 = str
    type Error = str
    pure def MAX_UINT = 2^256
    pure def MAX_UINT256 = 2^256
    pure def MAX_UINT64 = 2^64
    pure def MAX_UINT48 = 2^48
    pure def MAX_UINT16 = 2^16

    /// @dev This enumeration includes the following states:
    /// @param StateNone Default state, indicating the upgrade has not been set.
    /// @param LegalVetoPeriod The upgrade passed L2 voting process but it is waiting for the legal veto period.
    /// @param Waiting The upgrade passed Legal Veto period but it is waiting for the approval from guardians or Security Council.
    /// @param ExecutionPending The upgrade proposal is waiting for the delay period before being ready for execution.
    /// @param Ready The upgrade proposal is ready to be executed.
    /// @param Expired The upgrade proposal was expired.
    /// @param Done The upgrade has been successfully executed.
    type UpgradeState =
        | UpgradeStateNone 
        | UpgradeStateLegalVetoPeriod 
        | UpgradeStateWaiting
        | UpgradeStateExecutionPending
        | UpgradeStateReady
        | UpgradeStateExpired
        | UpgradeStateDone
    
    /// @dev This enumeration includes the following states:
    /// @param StatusNone Default state, indicating the freeze has not been happening in this upgrade cycle.
    /// @param Soft The protocol is/was frozen for the short time.
    /// @param Hard The protocol is/was frozen for the long time.
    /// @param AfterSoftFreeze The protocol was soft frozen, it can be hard frozen in this upgrade cycle.
    /// @param AfterHardFreeze The protocol was hard frozen, but now it can't be frozen until the upgrade.
    type FreezeStatus = FreezeStatusNone
        | FreezeStatusSoft
        | FreezeStatusHard
        | FreezeStatusAfterSoftFreeze
        | FreezeStatusAfterHardFreeze

    /// @dev Represents the status of an upgrade process, including the creation timestamp and actions made by guardians and Security Council.
    /// @param creationTimestamp The timestamp (in seconds) when the upgrade state was created.
    /// @param securityCouncilApprovalTimestamp The timestamp (in seconds) when Security Council approved the upgrade.
    /// @param guardiansApproval Indicates whether the upgrade has been approved by the guardians.
    /// @param guardiansExtendedLegalVeto Indicates whether guardians extended the legal veto period.
    /// @param executed Indicates whether the proposal is executed or not.
    type UpgradeStatus =  {
        creationTimestamp: Uint48,
        securityCouncilApprovalTimestamp: Uint48, 
        guardiansApproval: bool,
        guardiansExtendedLegalVeto: bool, 
        executed: bool
    }

    // the value of an uninitialized UpgradeStatus
    pure val upgradeStatusZero = {
        creationTimestamp: 0,
        securityCouncilApprovalTimestamp: 0, 
        guardiansApproval: false,
        guardiansExtendedLegalVeto: false, 
        executed: false
    }

    /// @dev Represents a call to be made during an upgrade.
    /// @param target The address to which the call will be made.
    /// @param value The amount of Ether (in wei) to be sent along with the call.
    /// @param data The calldata to be executed on the `target` address.
    type Call = {
        target: Address, 
        value: Uint256,
        data: Bytes,
    }

    /// @dev Defines the structure of an upgrade that is executed by Protocol Upgrade Handler.
    /// @param executor The L1 address that is authorized to perform the upgrade execution (if address(0) then anyone).
    /// @param calls An array of `Call` structs, each representing a call to be made during the upgrade execution.
    /// @param salt A bytes32 value used for creating unique upgrade proposal hashes.
    type UpgradeProposal = {
        calls: UpgradeProposalCallsOpaque,
        executor: Address,
        salt: Bytes32,
    }

    type UpgradeProposalCallsOpaque = str

    /// @dev Struct for L2 governor proposals parameters.
    /// @param targets Array of contract addresses to be called.
    /// @param values Array of ether values (in wei) to send with each call.
    /// @param calldatas Array of encoded function call data for each target.
    /// @param description Brief text or hash of the proposal for identification purposes.
    type L2GovernorProposal = {
        targets: List[Address],
        values: List[Uint256],
        calldata: List[Bytes],
        description: str,
    }

    // an opaque version of L2GovernorProposal, which we don't look into
    type L2GovernorProposalOpaque = str

    // an opaque version of TxRequest, which we don't look into
    type TxRequestOpaque = str

    type TxRequest = {
        to: Address,
        l2GasLimit: Uint256,
        l2GasPerPubdataByteLimit: Uint256,
        refundRecipient: Address,
        txMintValue: Uint
    }

    // An arbitrary length message passed from L2
    // @notice Under the hood it is `L2Log` sent from the special system L2 contract
    // @param txNumberInBatch The L2 transaction number in the batch, in which the message was sent
    // @param sender The address of the L2 account from which the message was passed
    // @param data An arbitrary length message
    type L2Message = {
        txNumberInBatch: Uint16,
        sender: Address,
        data: Bytes
    }

    type Result[a] = { v: a, err: str }

    // whenever a value causes an error, we wrap this value
    // into a structure that has the accompanying error message
    pure def err(value: a, msg: str): { v: a, err: str } = {
        { v: value, err: msg }
    }

    // whenever a value does not cause an error, we simply wrap it
    // into a structure that contains an empty error message
    pure def ok(value: a): { v: a, err: str } = {
        { v: value, err: "" }
    }

    // return true, when no error was reported
    pure def isOk(r: { v: a, err: str }): bool = { r.err == "" }

    // return true, when an error was reported
    pure def isErr(r: { v: a, err: str }): bool = { r.err != "" }

    // Option type

    /// A polymorphic option type
    type Option[a] =
        | Some(a)
        | None

    /// is `opt` of the shape `Some(...)`
    pure def is_some(opt: Option[a]): bool = {
        match (opt) {
            | Some(_) => true
            | None => false
        }
    }

    // is `opt` of the shape `None`
    pure def is_none(opt: Option[a]): bool = {
        not(is_some(opt))
    }

    // get `a` when `opt` is `Some(a)`; otherwise, get `default`
    pure def unwrap_or(opt: Option[a], default: a): a = {
        match (opt) {
            | Some(value) => value
            | None => default
        }
    }

    // if is Some(e), test whether `pred(e)` holds true
    def option_has(opt: Option[a], pred: a => bool): bool = {
        match (opt) {
            | None => true
            | Some(e) => pred(e)
        }
    }

    // return Some(mapper(e)) if opt is Some(e); otherwise None
    def option_map(opt: Option[a], mapper: a => b): Option[b] = {
        match (opt) {
            | None => None
            | Some(e) => Some(mapper(e))
        }
    }

    // return true, if a list `l` contains an element that satisfies `pred`
    pure def has(l: List[a], pred: a => bool): bool = {
        l.indices().exists(i => pred(l[i]))
    }

    // return true, if a list `l` contains an element that satisfies `pred`
    pure def has_elem(l: List[a], e: a): bool = {
        l.indices().exists(i => l[i] == e)
    }

    /// Get the map value associated with a key, or the default,
    /// if the key is not present.
    pure def getOrElse(__map: a -> b, __key: a, __default: b): b = {
        if (__map.keys().contains(__key)) {
            __map.get(__key)
        } else {
            __default
        }
    }
}