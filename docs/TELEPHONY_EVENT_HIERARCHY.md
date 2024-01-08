OUTBOUND: 

- connecting
#- sending
#- progress 
- accepted
- confirmed
- ended
- failed

INBOUND: 

- connecting
- accepted
- confirmed

- ended
- failed?


Scenarios

1. we start dialing, and cancel before it rings other side
    - connecting, sending, progress, failed
2. we start dialing, and let it ring other side, then cancel our side
    - connecting, sending, progress, failed
3. we start dialing, and let it ring other side, then remote answers
    - connecting, sending, progress, accepetd, confirmed, ended
4. we start dialing, and let it ring other side, then remote rejects
    - connecting, sending, progress, accepetd, confirmed, ended

Outbound call that we hang up before answering