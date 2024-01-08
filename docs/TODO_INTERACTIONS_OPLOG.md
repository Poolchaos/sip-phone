Instead of interaction info where I'm getting it before, get it from here:

REST: GET v1/organisation/interactions/members/{memberId}/interactions
OPLOG: interaction-projector.memberInteractionsView

and then to end wrap up call (with a PUT)


