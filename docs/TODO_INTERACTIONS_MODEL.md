Usages of InteractionsModel

- app-background / background task
	- ChromeDTL.subscribeToUpdates (for chrome extension updates)
		- we use InteractionsModel to check if we're on a call

- call-accepted-message-handler
	- InteractionsModel.findInteraction - (type CallModel), and enable "oncall" "step" if found. InteractionModel.saveState
- call-confirmed-message-handler
	- findInteraction , map properties, enable "oncall" step, save state
- call-connected-message-handler
	- findInteraction, enable "oncall" step, save state
- call-ended-message-handler
	- findInteraction, interaction.state.offCall = true, enable "stepEnded"
- call-failed-message-handler
	- multiple state changes
		- interactionsModel.callFailed(<null>) (when no payload)
		- (various JsSIP specific causes>)
			- sipController.C.causes.USER_DENIED_MEDIA_ACCESS - interactionsModel.noMediaAccess
			- sipController.C.causes.CANCELED - interactionsModel.callCanceled(messagePayload)
			- cause === "Rejected" - interactionsModel.callRejected(messagePayload)
			- otherwise 
				- interactionsModel.callFailed(messagePayload)
- dial-message-handlers
	- check InteractionsModel for "call not allowed", with implementation for this test in the handler
		- check all CallModels in interactions list to see if any of state.onCall || title includes "dialling" || title includes "incoming"
	- then, seems to insert a new outgoing interaction into the InteractionsModel list, and enable "dialling" step
- end-call-message-handler
	- (not used - IGNORE)
- end-wrap-up-message-handler
	- if (endAll), findAllWrapupInteractions(), interaction.ended = true, call endWrapup(interaction)
		- endWrapup - removeInteraction from InteractionModels list (of CallModel items)
	- call httpservice - goOffWrapup
- hold-call-message-handler
	- findInteraction
	- if call is muted (????? - i think this is a copy and paste error)
		interaction.state.onHold = true
	- else
		interaction.state.onHold = false
- mute-call-message-handler
	- findInteractin
	- if call is muted
		- interaction.state.onMute = true;
	- else
		- interaction.state.onMute = false;
- logout-message-handler
	- InteractionsModel.interactions = []
- outbound-flows-message-handler 
	- iterate through outboundFlowOptions
		if flow.selected, set interactionsModel.hasOutboundFlow = true
- outbound-interaction-started
	- findUnknownOutboundInteraction(messagePayload)
		- if found, and message payload has interactionId, set interaction.interactionId to message payload
		- save state
- sip-rtc-session.-message-handler
	-   constructor(data, stateChangeCallback?: () => void, removeInteractionCallback?: (interaction: CallModel) => void, isOutboundCallThroughFlow?: any) {
	- create a new CallModel, providing to constructor
		- stateChangeCallback = () => InteractionsModel.saveState()
		- removeInteractionCallback = () => (interaction: CallModel) => InteractionsModel.removeInteraction(interaction))
	- iterate through InteractionsModel.interactions
		- to see if our newly created interaction is in that list??!
		- if MATCH, 
			- if it has no channel, 
				interaction.enableIncomingStep()
				map properties of newly created instance to matchedInstance
		- if NO MATCH
			- interaction.enableIncomingStep()
			- add it to InteractionsModel.interactions
		- InteractionsModel.save state
