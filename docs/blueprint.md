# **App Name**: OCPPulse

## Core Features:

- Configuration Input: Input fields for OCPP server URL, Charge Station ID, ID Tag, and Connector ID.
- WebSocket Connection: Handle WebSocket connection to the specified OCPP backend.
- Boot Notification: Send BootNotification to the OCPP backend upon connection.
- Charging Simulation: Simulate charging flow, including sending MeterValues at intervals. Use a tool to decide which data to send and when, according to OCPP.
- Charging Control: Buttons to initiate StartTransaction, StopTransaction, and display connection status.

## Style Guidelines:

- Primary color: White or light grey for the background to provide a clean interface.
- Secondary color: Dark grey or black for text to ensure readability.
- Accent: Electric Blue (#7DF9FF) for interactive elements and to highlight the charging status.
- Use a clear, structured layout with input fields at the top, followed by status indicators and control buttons.
- Use standard icons for connection status, charging, and error messages.

## Original User Request:
can you create a simulator for an OCPP charger. where any ocpp backend can interact with the simulator. the simulator is written in typescript. and the result is only html page where all the logic will run in this page.

it can accept both ocpp 1.6 and ocpp 2.0.1 , we can input the OCPP url which is websocket url,charge_station id,id_tag of a user, then a connector_id of a charger.

the flow is we can fill all in input.

then can add button to connect. then it will send ocpp message to ocpp backend, then if received ocpp message from backend it will recognized as connected.

also we can add a button to start charging, stop charging,

please follow ocpp document about how the messaging of this ocpp. then on the start charging. please simulate real charging flow, by sending meter value and any data needed. but simulate real user charging
  