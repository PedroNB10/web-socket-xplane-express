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

// Referência de dados (dataRefs) que serão monitorados do X-Plane
const dataRefsNamesDict: { [key: string]: string } = {
  "sim/flightmodel/position/latitude": "Latitude",
  "sim/flightmodel/position/longitude": "Longitude",
  "sim/cockpit2/tcas/targets/position/vertical_speed": "Vertical Speed",
  "sim/flightmodel/position/groundspeed": "Ground Speed",
  "sim/flightmodel2/position/groundspeed": "Ground Speed 2",

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
  await getDataRefs(); // Aguarda a obtenção dos dataRefs

  const ws = new WebSocket('ws://localhost:8086/api/v1');

  // Armazenar o identificador da requisição para controle
  let reqId = 1;

  ws.on('open', () => {
    console.log('Conexão WebSocket estabelecida');
    // console.log(dataRefs);

    const request = JSON.stringify({
      "req_id": reqId++,  // Identificador único da requisição
      "type": "dataref_subscribe_values",  // Tipo de operação, supondo que 'subscribe' seja o correto
      "params": {
        "datarefs": dataRefs // Envia a lista de dataRefs
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
          console.log(`DataRef: ${dataRefDict[key]} - Valor: ${dataRefs.data[key]}`);

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

// Chama a função para configurar o WebSocket
setupWebSocket();
