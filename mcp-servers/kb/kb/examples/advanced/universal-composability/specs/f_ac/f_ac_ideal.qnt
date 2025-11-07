module f_acc_ideal {

  import basicSpells.* from "../../spells/basicSpells"
  import choreo(processes = NODES) as choreo_ac from "../../choreo"    

  


  pure val FAC   : Node = 1
  pure val ENV   : Node = 2
  pure val SIM   : Node = 3
  pure val NODES  = Set(FAC,ENV,SIM)

  pure val delta = 1
  pure val sid = 1
  pure val honestParties = Set(1,2,3)
  pure val corruptedParties = Set(4)
  pure val allParties = honestParties.union(corruptedParties)

  // Auxiliary types
  type Role = FAC_ROLE | SIM_ROLE | ENV_ROLE 


  type History = {
    msg_log: Set[({idx:int, msg: Message})],
  }  

  // Mandatory types for the Choreo
  type Node = int

  type Party = int
  type Data = int
  type Time = int

  type Message =

    | SendRequest({from:Party, to:Party, data:Data}) 
    | SIMSendHold({from:Party, to:Party, ctr:int, time:Time, data:Data})
    | SIMSendRelease({from:Party, to:Party,time:Time,ctr:int})
    | SendResponse

    | FetchRequest(Party)
    | SIMFetchHold({tp:Time, i_late: Set[Time], party:Party})
    | SIMFetchRelease({tp:Time, i_late: Set[Time], i_early: Set[Time], party:Party})
    | FetchResponse(Set[Data])

    | OKRequest(Party)
    | ClockRequest(Party)
    | ClockResponse
    | OKResponse

    | EnvGiveControl
    | SIMGiveControl  

  
  type StateFields = {
    // functionality variables
    ctr: int,
    L : int -> {from: Party, to:Party, time:Time, data:Data},
    done : {from:Party,to:Party,time:Time} -> bool,
    role : Role,

    // simulator variables
    sim_handles : Set[(Message)], // for SIM to store hold requests
  }

  type CustomEffects = ExcludeMsg({node:Node, msg:Message}) | Log(Message)
  type Event = ()
  type Extensions = History

  /* Boilerplate */
  type LocalState = choreo_ac::LocalState[Node, StateFields]
  type LocalContext = choreo_ac::LocalContext[Node, StateFields, Message, Event, Extensions]
  type Transition = choreo_ac::Transition[Node, StateFields, Message, Event, CustomEffects]
  type GlobalContext_AC = choreo_ac::GlobalContext[
    Node,
    StateFields,
    Message,
    Event,
    Extensions
  ]

  import g_clock_ideal as g_clock from "../g_clock/g_clock_ideal" 

  def global_context : GlobalContext_AC = choreo_ac::s  

  

//   pure def get_send_request_messages(messages: Set[Message]): Set[{from:Party, to:Party, data:Data}] = {
//     messages.filterMap(m => {
//       match m {
//         | SendRequest(p) => Some(p)
//         | _ => None
//       }
//     })
//   }

//   pure def get_sim_send_hold_messages(messages: Set[Message]): Set[{from:Party, to:Party, ctr:int, time:Time, data:Data}] = {
//     messages.filterMap(m => {
//       match m {
//         | SIMSendHold(p) => Some(p)
//         | _ => None
//       }
//     })
//   }

//   pure def get_sim_send_release_messages(messages: Set[Message]): Set[{from:Party, to:Party, time:Time, ctr:int}] = {
//     messages.filterMap(m => {
//       match m {
//         | SIMSendRelease(p) => Some(p)
//         | _ => None
//       }
//     })
//   }

//   pure def get_clock_request_messages(messages: Set[Message]): Set[Party] = {
//     messages.filterMap(m => {
//       match m {
//         | ClockRequest(p) => Some(p)
//         | _ => None
//       }
//     })
//   }

//   pure def get_clock_response_messages(messages: Set[Message]): Set[()] = {
//     messages.filterMap(m => {
//       match m {
//         | ClockResponse => Some(())
//         | _ => None
//       }
//     })
//   }  

//   pure def get_send_response_messages(messages: Set[Message]): Set[()] = {
//     messages.filterMap(m => {
//       match m {
//         | SendResponse => Some(())
//         | _ => None
//       }
//     })
//   }

//   pure def get_fetch_request_messages(messages: Set[Message]): Set[Party] = {
//     messages.filterMap(m => {
//       match m {
//         | FetchRequest(p) => Some(p)
//         | _ => None
//       }
//     })
//   }

//   pure def get_sim_fetch_hold_messages(messages: Set[Message]): Set[{tp:Time, i_late: Set[Time], party:Party}] = {
//     messages.filterMap(m => {
//       match m {
//         | SIMFetchHold(p) => Some(p)
//         | _ => None
//       }
//     })
//   }

//   pure def get_sim_fetch_release_messages(messages: Set[Message]): Set[{tp:Time, i_late: Set[Time], i_early: Set[Time], party:Party}] = {
//     messages.filterMap(m => {
//       match m {
//         | SIMFetchRelease(p) => Some(p)
//         | _ => None
//       }
//     })
//   }

//   pure def get_fetch_response_messages(messages: Set[Message]): Set[Set[Data]] = {
//     messages.filterMap(m => {
//       match m {
//         | FetchResponse(p) => Some(p)
//         | _ => None
//       }
//     })
//   }

//   pure def get_env_give_control_messages(messages: Set[Message]): Set[()] = {
//     messages.filterMap(m => {
//       match m {
//         | EnvGiveControl => Some(())
//         | _ => None
//       }
//     })
//   }

//   pure def get_sim_give_control_messages(messages: Set[Message]): Set[()] = {
//     messages.filterMap(m => {
//       match m {
//         | SIMGiveControl => Some(())
//         | _ => None
//       }
//     })
//   }
  
//   // def send_1(ctx: LocalContext) : Set[Transition] = {
//   //   if(ctx.state.role == FAC_ROLE){
//   //     ctx.messages.get_send_request_messages().map(p => {

//   //       val t = g_clock::choreo_s.system.get(g_clock::GLOCK).TIME // to make traces shorter
//   //       val new_ctr = ctx.state.ctr + 1
//   //       val new_done = ctx.state.done.set({from:p.from,to:p.to,time:t}, false)
//   //       //
//   //       val new_L = ctx.state.L.set(new_ctr, {from:p.from, to:p.to, time:t, data:p.data})

//   //       val transition = {
//   //           effects: Set(
//   //             choreo::CustomEffect(ExcludeMsg( {node:ctx.state.process_id, msg: SendRequest(p)}) ),
//   //             choreo::CustomEffect(Log(SendRequest(p))),

//   //             choreo::Send(({to: SIM, message: SIMSendHold({
//   //               from:p.from,
//   //               to:p.to,
//   //               ctr:new_ctr,
//   //               time:t,
//   //               data:p.data
//   //             })})),
//   //           ),
//   //           post_state: { ...ctx.state, 
//   //             ctr: new_ctr,
//   //             done: new_done,
//   //             L: new_L
//   //           }, 
//   //         }

//   //         transition
//   //     })
//   //   }else{
//   //     Set()
//   //   }
//   // }  

//   // pure def send_2(ctx: LocalContext) : Set[Transition] = {
//   //   if(ctx.state.role == FAC_ROLE){
//   //     ctx.messages.get_sim_send_release_messages().map(p => {

//   //  //{from:Party, to:Party,time:Time,ctr:int}
//   //       val transition = {
//   //           effects: Set(
//   //             choreo::CustomEffect(ExcludeMsg( {node:ctx.state.process_id, msg: SIMSendRelease(p)}) ),
//   //             choreo::Send(({to: ENV, message: SendResponse})),
//   //           ),
//   //           post_state: { ...ctx.state, 
//   //             done: ctx.state.done.set({from:p.from,to:p.to, time:p.time}, true),
//   //           }, 
//   //         }

//   //         transition
//   //     })
//   //   }else{
//   //     Set()
//   //   }
//   // }    


//   // pure def sim_send_hold_reqs(ctx: LocalContext) : Set[Transition] = {
//   //   if(ctx.state.role == SIM_ROLE and ctx.messages.get_sim_send_hold_messages().size() > 0){
//   //     val juice = ctx.messages.get_sim_send_hold_messages().find(x => true).unwrap()

//   //     Set({
//   //           effects: Set(
//   //             choreo::CustomEffect(ExcludeMsg( {node:ctx.state.process_id, msg: SIMSendHold(juice) })),
//   //             choreo::Send(({ to: SIM, message: SIMGiveControl })),
//   //           ),
//   //           post_state: { ...ctx.state, 
//   //             sim_handles: ctx.state.sim_handles.union(Set((SIMSendRelease({
//   //               from:juice.from,
//   //               to:juice.to,
//   //               time:juice.time,
//   //               ctr:juice.ctr
//   //             })))),
//   //           }, 
//   //         })

//   //   }else{
//   //     Set()
//   //   }
//   // }  

//   // pure def sim_process_hold_reqs(ctx: LocalContext) : Set[Transition] = {
//   //   if(ctx.state.role == SIM_ROLE and ctx.state.sim_handles.size() > 0 and ctx.messages.contains(SIMGiveControl)){
//   //     val release_trans = ctx.state.sim_handles.map(release_request =>
      
//   //       Set({
//   //           effects: Set(
//   //             choreo::CustomEffect(ExcludeMsg( {node:ctx.state.process_id, msg: SIMGiveControl })),
//   //             choreo::Send(({ to: FAC, message: release_request  })), 
//   //           ),
//   //           post_state: { ...ctx.state, 
//   //             sim_handles: ctx.state.sim_handles.exclude(Set( release_request) ),
//   //           }, 
//   //         })      
//   //     ).flatten()

//   //     release_trans.union(
//   //       Set({
//   //           effects: Set(
//   //             choreo::CustomEffect(ExcludeMsg( {node:ctx.state.process_id, msg: SIMGiveControl })),
//   //             choreo::Send(({ to: ENV, message: EnvGiveControl })),
//   //           ),
//   //           post_state: ctx.state, 
//   //         })      
//   //     )
      
//   //   }else{
//   //     Set()
//   //   }
//   // }


//   // def fetch_1(ctx: LocalContext) : Set[Transition] = {
//   //   if(ctx.state.role == FAC_ROLE){
//   //     ctx.messages.get_fetch_request_messages().map(p => {

//   //       val tp = g_clock::choreo_s.system.get(g_clock::GLOCK).TIME // to make traces shorter
//   //       val i_late = ctx.state.L.keys().filterMap(k => {
//   //         val v = ctx.state.L.get(k)
//   //         if(v.to == p and (tp - v.time) == delta){
//   //           Some(k)
//   //         }else{
//   //           None
//   //         }
//   //       })

//   //       val transition = {
//   //           effects: Set(
//   //             choreo::CustomEffect(ExcludeMsg( {node:ctx.state.process_id, msg: FetchRequest(p)}) ),
//   //             choreo::CustomEffect(Log(FetchRequest(p))),
//   //             choreo::Send(({to: SIM, message: SIMFetchHold({
//   //               tp:tp,
//   //               i_late:i_late,
//   //               party:p
//   //             })})),              

//   //           ),
//   //           post_state: { ...ctx.state, 
//   //           }, 
//   //         }

//   //         transition
//   //     })
//   //   }else{
//   //     Set()
//   //   }
//   // }  

//   // def fetch_2(ctx: LocalContext) : Set[Transition] = {
//   //   if(ctx.state.role == FAC_ROLE){
//   //     ctx.messages.get_sim_fetch_release_messages().map(p => {

//   //       val i_early = p.i_early
//   //       // remove filter map to check model checker's liveness
//   //       val i_late  = p.i_late.filterMap(i => {
//   //         val v = ctx.state.L.get(i)
//   //         if(v.to == p.party){
//   //           Some(i)
//   //         }else{
//   //           None
//   //         }
//   //       })

//   //       val msgs = i_early.union(i_late).map(k => ctx.state.L.get(k).data)
//   //       val new_L = ctx.state.L.keys().exclude(i_early.union(i_late)).mapBy(k => ctx.state.L.get(k))

//   //       val transition = {
//   //           effects: Set(
//   //             choreo::CustomEffect(ExcludeMsg( {node:ctx.state.process_id, msg: SIMFetchRelease(p)})),
//   //             choreo::Send(({to: ENV, message: FetchResponse(msgs)})),               
//   //           ),
//   //           post_state: { ...ctx.state, 
//   //             L : new_L
//   //           }, 
//   //         }

//   //         transition
//   //     })
//   //   }else{
//   //     Set()
//   //   }
//   // }    


//   // def ok_1(ctx: LocalContext) : Set[Transition] = {
//   //   if(ctx.state.role == FAC_ROLE){
//   //     ctx.messages.get_fetch_request_messages().map(p => {

//   //       val tp = g_clock::choreo_s.system.get(g_clock::GLOCK).TIME // to make traces shorter
        

//   //       val transition = {
//   //           effects: Set(
//   //             choreo::CustomEffect(ExcludeMsg( {node:ctx.state.process_id, msg: FetchRequest(p)}) ),
//   //             choreo::CustomEffect(Log(FetchRequest(p))),
//   //             choreo::Send(({to: ENV, message: ClockRequest(p)})),              

//   //           ),
//   //           post_state: { ...ctx.state, }, 
//   //         }

//   //         transition
//   //     })
//   //   }else{
//   //     Set()
//   //   }
//   // }  

//   // action interact1 : bool = {

//   //   val qq = choreo::s.messages.get(ENV).get_clock_request_messages().map(p =>
//   //       {
//   //         effects: Set(
//   //             choreo::CustomEffect(ExcludeMsg( {node:ENV, msg: ClockRequest(p)}) ),
//   //             choreo::CustomEffect(Log(ClockRequest(p))),            
//   //         ),
//   //         post_state: choreo::s.system.get(ENV), 
//   //       }      
//   //   )    


//   //   val clock_transitions = choreo::s.messages.get(ENV).get_clock_request_messages().map(p =>
//   //       {
//   //         effects: Set(
//   //           g_clock::choreo_Send(({ to: g_clock::GLOCK, message: g_clock::OkayRequest({party:p, sid: sid}) })),
//   //         ),
//   //         post_state: g_clock::choreo_s.system.get(g_clock::GLOCK), 
//   //       }      
//   //   )
//   //   all{
//   //     //choreo::process_transitions(ENV, qq, apply_custom_effect),
//   //     stutter,
//   //     g_clock::choreo_process_transitions(g_clock::GLOCK, clock_transitions, g_clock::apply_custom_effect),
//   //   }
    
//   // }

//   action interact2(s : LocalState) : bool = {
//     val tr : Transition =         {
//             effects: Set(),
//             post_state: s
//     //             {
//     //   process_id: choreo::s.system.get(ENV).process_id,

//     //   role:  choreo::s.system.get(ENV).role,
//     //   L: choreo::s.system.get(ENV).L,
//     //   done: choreo::s.system.get(ENV).done,
//     //   ctr : choreo::s.system.get(ENV).ctr,

//     //   sim_handles : choreo::s.system.get(ENV).sim_handles,
//     //   //sim_ctr : 0,

//     // }
            
//             , 
//           }
//     all {
//       choreo_ac::process_transitions(ENV, 
//       Set(tr)
      
//       , apply_custom_effect ),
//     }

//   }



//   // def main_listener(ctx: LocalContext): Set[Transition] =
//   //   Set(
//   //     send_1(ctx),
//   //     send_2(ctx),
//   //     fetch_1(ctx),
//   //     fetch_2(ctx)
//   //   ).flatten()


//   // pure def apply_custom_effect(env: GlobalContext, effect: CustomEffects): GlobalContext = {
//   //   match effect {
//   //     | ExcludeMsg(p) => {... env, messages: env.messages.setBy(p.node, (old => old.exclude(Set(p.msg))))}
//   //     | Log(msg) => {
//   //         {...env, extensions: {...env.extensions, msg_log: env.extensions.msg_log.setAdd(
//   //           { idx:env.extensions.msg_log.size(),
//   //             msg:msg,
//   //           })}}
//   //     }
//   //   }
//   // }

//   pure def apply_custom_effect(env: GlobalContext, effect: CustomEffects): GlobalContext = {
//     env
//   }  

//   action stutter = {
//     choreo_ac::s' = choreo_ac::s
//   }


//   def env_state : LocalState = choreo_ac::s.system.get(ENV)

//   action step = any {
//     // all{
//     //   stutter,
//     //   //choreo::step((ctx => main_listener(ctx)),apply_custom_effect),
//     //   g_clock::stutter
//     // },
    
//     // interact1,
//     all {
//       interact2(env_state),
//       //g_clock::stutter
//     },

//     // all{
//     //   stutter,
//     //   g_clock::step
//     // }
//   }  


// pure def initialize(n: Node): LocalState = {
//     {
//       process_id: n,

//       role: if (n == FAC) FAC_ROLE else if (n == SIM) SIM_ROLE else ENV_ROLE,
//       L: Map(),
//       done: Map(),
//       ctr : 0,

//       sim_handles : Set(),
//       //sim_ctr : 0,

//     }
//   }

//   pure val initial_history = {
//     msg_log: Set(),
//   }  

//   action init = all {
//     choreo_ac::init({
//       system: NODES.mapBy(n => initialize(n)),
//       messages: NODES.mapBy(n => if (n == ENV)  
//          Set(ClockRequest(1))
//        else Set()),
//     events: NODES.mapBy(n => Set()),
//     extensions: initial_history
//   }),
//     //g_clock::init
//   }

//   // action interact : bool = all {

//   //   g_clock::choreo_s.messages.get(g_clock::ENV).size() > 0,

//   //   nondet envmsg = oneOf(g_clock::choreo_s.messages.get(g_clock::ENV))
//   //   nondet node = oneOf(g_clock::NODES)
//   //   nondet sid = oneOf(g_clock::SIDs)
//   //   nondet req = 1.to(3).oneOf()

//   //   val msg = if (req == 1) {
//   //     g_clock::RegisterRequest({party:node, sid:sid})
//   //   } else if (req == 2) {
//   //     g_clock::OkayRequest({party:node, sid:sid})
//   //   } else /* req == 3 */ {
//   //     g_clock::TimeRequest({party:node, sid:sid})
//   //   }

//   //   val req_transition = {
//   //         effects: Set(
//   //           g_clock::choreo_CustomEffect(g_clock::Log(envmsg)),
//   //           g_clock::choreo_CustomEffect(g_clock::ExcludeMsg( {node:g_clock::ENV, msg: envmsg }) ),
//   //           g_clock::choreo_Send(({ to: g_clock::GLOCK, message: msg })),
//   //         ),
//   //         post_state: g_clock::choreo_s.system.get(g_clock::ENV), 
//   //       }

//   //   val sim_transition = {
//   //         effects: Set(
//   //           g_clock::choreo_CustomEffect(g_clock::Log(envmsg)),
//   //           g_clock::choreo_CustomEffect(g_clock::ExcludeMsg( {node:g_clock::ENV, msg: envmsg }) ),
//   //           g_clock::choreo_Send(({ to: g_clock::SIM, message: g_clock::SIMGiveControl })),
//   //         ),
//   //         post_state: g_clock::choreo_s.system.get(g_clock::ENV), 
//   //       }        

//   //   g_clock::choreo_process_transitions(g_clock::ENV, Set(req_transition), g_clock::apply_custom_effect)
//   // }


//   // action init = {
//   //   g_clock::init
//   // }

//   // action step = any {
//   //   g_clock::step,
//   //   interact
//   // }


//   val Prop = choreo_ac::s.messages.get(ENV).get_clock_response_messages().size() == 0
  
//   // val LogGrows3 = 
//   //    g_clock::choreo_s.extensions.msg_log.size() < 2
    
}