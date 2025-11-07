module types {
    type Addr = str
    type UserData = {        
        migrated: bool,
        // this one captures that xyk liquidity doesn't exist anymore (could be due to withdrawing, or due to migrating)
        // This inelegant design is due to co-evolution of the model and the adapter, and letting adapter take 
        // some logic onto itself
        xyk_liquidity_withdrawn: bool,
        // this is only for the case when the user has withdrawn liquidity before migration
        xyk_liquidity_withdrawn_before_migration: bool,
        pcl_liquidity_withdrawn: bool,
        has_xyk_rewards: bool,
        has_pcl_rewards: bool,
        only_vesting: bool
    }

    type Denom = str
    type Coin = {
        denom: Denom,
        amount: int
    }

    type MsgInfo = {
        sender: Addr,
        // NOT MODELLING SENDING FUNDS IN THIS FUZZING MODEL
        // funds: List[Coin]
    }
    


    type StepInfo = {
        actionTaken: str,
        msgArgs: MsgArgs,
        msgInfo: MsgInfo,
        actionSuccessful: bool,
        actionErrorDescription: str
    }
    
    type MsgArgs = 
        | None 
        | MigrateArgs({user_address: Addr})
        | ClaimRewardsArgs({withdraw: bool})
        | InitArgs(
            Addr -> {NTRN_locked: int,
                    ATOM_locked: int,
                    USDC_locked: int}
                    )

}