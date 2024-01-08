const channel = new BroadcastChannel('sw-messages');
console.log(' ::>> service worker is live. Adding listeners ');

channel.onmessage = function(e) {
  console.log('Received message ', e.data);
  const event = e.data;
  switch(event) {
    case 'sw-message': 
      // this initialised the client
      break;
    case 'flaap-test':
      console.log('This is a test message', self);
      break;
  }
};

self.addEventListener('notificationclick', (event) => {
  console.log('Notification Click.', event);
  event.notification.close();

  if (!event.action) {
    console.log('No action.');
    return;
  }
  channel.postMessage({ action: event.action });

  // This looks to see if the current is already open and  
  // focuses if it is  
  event.waitUntil(
    clients.matchAll({
      type: "window"
    })
    .then((clientList) => {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url == '/' && 'focus' in client) {
          return client.focus();
        }
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  channel.postMessage({ action: 'reject' });
});
