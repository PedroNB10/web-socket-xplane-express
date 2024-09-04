import { serverHttp } from './http.js';
import WebSocket from 'ws';
import axios from 'axios';

serverHttp.listen(3000, () => {
  console.log('Server is running on port 3000');
});

interface DataRef {
  id: number;
  is_writable: boolean;
  name: string;
  value_type: string;
}

let dataRefs: DataRef[] = []

// Reference names for the datarefs on the simulator X-Plane 12
const dataRefsNamesDict: { [key: string]: string } = {
  "sim/flightmodel/position/latitude": "lat",
  "sim/flightmodel/position/longitude": "lng",
  "sim/cockpit2/tcas/targets/position/vertical_speed": "vspeed",
  "sim/flightmodel/position/groundspeed": "speed",
  "sim/cockpit2/gauges/indicators/altitude_ft_pilot": "alt",
  "sim/cockpit2/gauges/indicators/compass_heading_deg_mag": "heading",

};

const dataRefDict: { [key: string]: string } = {};

async function getDataRefs() {
  try {
    const response = await axios.get('http://localhost:8086/api/v1/datarefs');

    if (response.status === 200) {
      let arrayOfDataRefsObjects = response.data.data;
      dataRefs = arrayOfDataRefsObjects.filter((dataref: DataRef) =>{


        if (dataref && dataref.name && dataref.name in dataRefsNamesDict) {
          dataRefDict[dataref.id] = dataref.name
          return true;
          }
      }
       
      );

    }
  } catch (error) {
    console.error(`Erro ao enviar mensagem: ${error}`);
  }
}

async function setupWebSocket() {
  await getDataRefs(); 

  const ws = new WebSocket('ws://localhost:8086/api/v1');

  let reqId = 1;

  ws.on('open', () => {
    console.log('Conexão WebSocket estabelecida');

    const request = JSON.stringify({
      "req_id": reqId++, // Unique request ID
      "type": "dataref_subscribe_values", // Type of request
      "params": {
        "datarefs": dataRefs 
      }
    });

    try {
      ws.send(request);
    } catch (error) {
      console.error(`Erro ao enviar mensagem: ${error}`);
    }
  });



  interface DataRefUpdate{
    data: {
      [key: string]: number
    },
    type: string

  }
 
  ws.on('message', (data:any) => {
    let dataRefs:DataRefUpdate = JSON.parse(data);

    if (dataRefs.type === 'dataref_update_values') {
      console.log('Atualização de valores de DataRefs:');
      
      for (let key in dataRefs.data) {
        if(dataRefDict[key]){
          console.log(`DataRef: ${dataRefsNamesDict[dataRefDict[key]]} - Value: ${dataRefs.data[key]} Type of Data: ${typeof dataRefs.data[key]}`);

        }
      }
      console.log('\n-----------------------------------\n');
    }
    

  });

  ws.on('close', () => {
    console.log('Conexão WebSocket fechada');
  });

  ws.on('error', (error) => {
    console.error(`Erro na conexão WebSocket: ${error}`);
  });
}

setupWebSocket();
