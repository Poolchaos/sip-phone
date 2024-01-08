## To test prod-intl telephony

Change your DNS to use 192.168.3.55. YOu must be in the Zailab Cape Town office, or on the VPN for this to work, as there is no public address for this DNS server.

This resolves sip.zailab.com as it would be for U.S. clients (dns resolution is geo-location aware), so US users would resolve to a different SIP server to South African users.