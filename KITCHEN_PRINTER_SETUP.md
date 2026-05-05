# 🖨️ Automatic Kitchen Printer Setup Guide

To get **Auto KOT** (printing without a popup dialog), follow these steps to set up the "Hardware Bridge" on the computer connected to your thermal printer.

## 1. Prerequisites
- Install [Node.js](https://nodejs.org/) on your kitchen PC.
- Connect your thermal printer (USB/Network/Bluetooth).

## 2. Generate Your Credentials
Download your `firebase-applet-config.json` from the AI Studio file explorer and save it in a new folder on your computer.

## 3. The Bridge Script
Create a file named `bridge.js` in that folder and paste the following code:

```javascript
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, onSnapshot, updateDoc, doc } = require('firebase/firestore');
const escpos = require('escpos');
escpos.USB = require('escpos-usb'); // Or escpos-network for IP printers

// 1. Load your config
const firebaseConfig = require('./firebase-applet-config.json');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 2. Setup your printer
const device = new escpos.USB(); // Adjust this to your printer type
const printer = new escpos.Printer(device);

console.log("🚀 Kitchen Printer Bridge is running...");

// 3. Listen for new print jobs
const q = query(collection(db, 'print_queue'), where('status', '==', 'pending'));

onSnapshot(q, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === 'added') {
      const job = change.doc.data();
      const order = job.data;
      
      console.log(`🖨️ Printing Order #${order.id.slice(-4)}...`);

      device.open(() => {
        printer
          .font('a')
          .align('ct')
          .style('bu')
          .size(1, 1)
          .text('KITCHEN ORDER TICKET')
          .text('--------------------------------')
          .align('lt')
          .text(`ORDER: #${order.id.slice(-4).toUpperCase()}`)
          .text(`TABLE: ${order.tableNumber}`)
          .text(`DATE: ${new Date().toLocaleString()}`)
          .text('--------------------------------')
          
        order.items.forEach(item => {
          printer.text(`${item.quantity}x ${item.name}`);
          if (item.variant) printer.text(`   Size: ${item.variant}`);
          if (item.note) printer.text(`   !!! ${item.note}`);
        });

        printer
          .text('--------------------------------')
          .feed(3)
          .cut()
          .close();
          
        // Mark job as completed
        updateDoc(doc(db, 'print_queue', change.doc.id), { status: 'completed' });
      });
    }
  });
});
```

## 4. Run the Bridge
Open your terminal in that folder and run:
```bash
npm init -y
npm install firebase escpos escpos-usb
node bridge.js
```

Now, every time a customer places an order or you click "Print KOT" in the admin dashboard, your printer will automatically print the ticket!
