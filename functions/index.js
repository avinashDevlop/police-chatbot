const functions = require('firebase-functions');
const { WebhookClient } = require('dialogflow-fulfillment');
const ipcData = require('./ipc_data.json');

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });

  function handleSectionLookup(agent) {
    const section = agent.parameters.section_number;
    const data = ipcData.sections.find(item => item.section === section);
    
    if (data) {
      agent.add(`IPC Section ${section}: ${data.offense}\n` +
               `Punishment: ${data.punishment}\n` +
               `Cognizable: ${data.cognizable}\n` +
               `Bailable: ${data.bailable}\n` +
               `Court: ${data.court}`);
    } else {
      agent.add(`IPC Section ${section} not found.`);
    }
  }

  function handleOffenseSearch(agent) {
    const offense = agent.parameters.offense_name.toLowerCase();
    const results = ipcData.sections.filter(item => 
      item.offense.toLowerCase().includes(offense));
    
    if (results.length > 0) {
      let reply = "Matching IPC Sections:\n";
      results.forEach(item => {
        reply += `- Section ${item.section}: ${item.offense}\n`;
      });
      agent.add(reply);
    } else {
      agent.add(`No IPC section found for '${offense}'.`);
    }
  }

  let intentMap = new Map();
  intentMap.set('IPC Section Lookup', handleSectionLookup);
  intentMap.set('Offense Search', handleOffenseSearch);
  agent.handleRequest(intentMap);
});