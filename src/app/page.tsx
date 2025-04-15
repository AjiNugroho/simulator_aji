"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/icons";
import { Textarea } from "@/components/ui/textarea";

// OCPP Message Types
const CALL = 2;
const CALLRESULT = 3;
const CALLERROR = 4;

// OCPP Actions
const BOOT_NOTIFICATION = "BootNotification";
const START_TRANSACTION = "StartTransaction";
const STOP_TRANSACTION = "StopTransaction";
const METER_VALUES = "MeterValues";

interface MeterValue {
  timestamp: string;
  sampledValue: {
    value: string;
    unit?: string;
    measurand?: string;
    context?: string;
  };
}

interface ConnectorStatus {
  connectorId: number;
  status: string;
}

interface WebSocketMessage {
  messageTypeId: number;
  uniqueId: string;
  actionOrPayload: string | any;
  payloadOrError?: any;
}

const generateUniqueId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

const Home = () => {
  const [serverUrl, setServerUrl] = useState<string>("");
  const [chargeStationId, setChargeStationId] = useState<string>("");
  const [idTag, setIdTag] = useState<string>("");
  const [connectorId, setConnectorId] = useState<number>(1);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [transactionId, setTransactionId] = useState<number | null>(null);
  const [meterValueInterval, setMeterValueInterval] = useState<number>(60); // Default 60 seconds
  const [ocppVersion, setOcppVersion] = useState<string>("1.6"); // Default to OCPP 1.6
  const [connectionLog, setConnectionLog] = useState<string>("");
  const ws = useRef<WebSocket | null>(null);
  const meterValueIntervalRef = useRef<number>(meterValueInterval);

  meterValueIntervalRef.current = meterValueInterval; // Update the ref

  const logConnection = (message: string) => {
    setConnectionLog((prevLog) => `${new Date().toLocaleTimeString()} - ${message}\n${prevLog}`);
  };

  useEffect(() => {
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const connect = () => {
    if (!serverUrl || !chargeStationId) {
      alert("Please provide OCPP server URL and Charge Station ID.");
      return;
    }

    ws.current = new WebSocket(serverUrl, ocppVersion === "2.0.1" ? "ocpp2.0.1" : "ocpp1.6");

    ws.current.onopen = () => {
      setIsConnected(true);
      logConnection("Connected to OCPP backend.");
      sendBootNotification();
    };

    ws.current.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        logConnection(`Received message: ${event.data}`);

        switch (message.messageTypeId) {
          case CALLRESULT:
            // Handle the result of a call
            logConnection(`Call result received for action: ${message.actionOrPayload}`);
            if (typeof message.actionOrPayload === 'object' && message.actionOrPayload !== null) {
              // Process the payload as needed
              logConnection(`Payload: ${JSON.stringify(message.actionOrPayload)}`);
            }
            break;
          case CALLERROR:
            // Handle the error of a call
            logConnection(`Call error received for action: ${message.actionOrPayload}, Error: ${JSON.stringify(message.payloadOrError)}`);
            break;
          default:
            logConnection(`Unknown message type received: ${message.messageTypeId}`);
        }
      } catch (error) {
        logConnection(`Error parsing message: ${error}`);
      }
    };

    ws.current.onclose = () => {
      setIsConnected(false);
      setIsCharging(false);
      clearInterval(meterValueIntervalRef.current);
      logConnection("Disconnected from OCPP backend.");
    };

    ws.current.onerror = (error) => {
      setIsConnected(false);
      setIsCharging(false);
      clearInterval(meterValueIntervalRef.current);
      console.error("WebSocket error:", error);
      logConnection(`WebSocket error: ${error}`);
    };
  };

  const send = (message: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const jsonMessage = JSON.stringify(message);
      ws.current.send(jsonMessage);
      logConnection(`Sent message: ${jsonMessage}`);
    } else {
      alert("WebSocket is not connected.");
    }
  };

  const sendBootNotification = () => {
    const uniqueId = generateUniqueId();
    const payload = {
      chargePointVendor: "Firebase Studio",
      chargePointModel: "OCPPulse Simulator",
      // Additional optional fields based on OCPP version
      ...(ocppVersion === "2.0.1"
        ? {
          // ocpp 2.0.1 required payload
          reason: "PowerUp",
        }
        : {
          // ocpp 1.6 optional payload
          firmwareVersion: "1.0",
        }),
    };

    const message: WebSocketMessage = {
      messageTypeId: CALL,
      uniqueId: uniqueId,
      actionOrPayload: BOOT_NOTIFICATION,
      payloadOrError: payload,
    };

    send(message);
  };

  const startCharging = () => {
    if (!isConnected || isCharging || !idTag || !connectorId) {
      alert("Please connect to the OCPP backend, ensure ID Tag and Connector ID are provided, and that charging is not already active.");
      return;
    }

    const uniqueId = generateUniqueId();
    const payload = {
      connectorId: connectorId,
      idTag: idTag,
      ...(ocppVersion === "2.0.1" ? { evseId: 1 } : {}),
    };

    const message: WebSocketMessage = {
      messageTypeId: CALL,
      uniqueId: uniqueId,
      actionOrPayload: START_TRANSACTION,
      payloadOrError: payload,
    };

    send(message);

    // Optimistically set the charging state
    setIsCharging(true);

    // Simulate the response from the backend
    setTimeout(() => {
      const receivedTransactionId = Math.floor(Math.random() * 1000);
      setTransactionId(receivedTransactionId);
      logConnection(`StartTransaction response simulated. Transaction ID: ${receivedTransactionId}`);

      // Start sending MeterValues at intervals
      simulateMeterValues(receivedTransactionId);
    }, 1000); // Simulate a 1-second delay for the backend to respond
  };

  const simulateMeterValues = (transactionId: number) => {
    if (!isConnected || !isCharging) {
      console.warn("Cannot simulate meter values: not connected or not charging.");
      return;
    }

    // Start sending MeterValues at intervals
    const intervalId = setInterval(() => {
      if (!ws.current || ws.current.readyState !== WebSocket.OPEN || !isCharging) {
        clearInterval(intervalId);
        return;
      }

      const uniqueId = generateUniqueId();
      const meterValues: MeterValue[] = [
        {
          timestamp: new Date().toISOString(),
          sampledValue: {
            value: (Math.random() * 10).toFixed(2), // Simulate increasing energy consumption
            unit: "kWh",
            measurand: "Energy.Active.Import.Register",
            context: "Sample.Periodic",
          },
        },
      ];

      const payload = {
        connectorId: connectorId,
        transactionId: transactionId,
        meterValue: meterValues,
      };

      const message: WebSocketMessage = {
        messageTypeId: CALL,
        uniqueId: uniqueId,
        actionOrPayload: METER_VALUES,
        payloadOrError: payload,
      };

      send(message);
    }, meterValueIntervalRef.current * 1000);
  };

  const stopCharging = () => {
    if (!isConnected || !isCharging || !transactionId) {
      alert("Please connect to the OCPP backend, start charging, and ensure a transaction ID is available before stopping the transaction.");
      return;
    }

    const uniqueId = generateUniqueId();
    const payload = {
      transactionId: transactionId,
      idTag: idTag,
      ...(ocppVersion === "2.0.1" ? { evseId: 1 } : {}),
    };

    const message: WebSocketMessage = {
      messageTypeId: CALL,
      uniqueId: uniqueId,
      actionOrPayload: STOP_TRANSACTION,
      payloadOrError: payload,
    };

    send(message);
    setIsCharging(false);
    setTransactionId(null);
    logConnection("Stop charging requested.");
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold mb-4 text-gray-800">OCPPulse Simulator</h1>

      <Card className="w-full max-w-md mb-4 shadow-md rounded-lg">
        <CardHeader className="py-3 px-4 bg-gray-50 border-b">
          <Label className="text-lg font-semibold text-gray-700">Configuration</Label>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="serverUrl">OCPP Server URL</Label>
              <Input
                id="serverUrl"
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="wss://your-ocpp-backend.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="chargeStationId">Charge Station ID</Label>
              <Input
                id="chargeStationId"
                type="text"
                value={chargeStationId}
                onChange={(e) => setChargeStationId(e.target.value)}
                placeholder="Station001"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="idTag">ID Tag</Label>
              <Input
                id="idTag"
                type="text"
                value={idTag}
                onChange={(e) => setIdTag(e.target.value)}
                placeholder="User123"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="connectorId">Connector ID</Label>
              <Input
                id="connectorId"
                type="number"
                value={connectorId}
                onChange={(e) => setConnectorId(Number(e.target.value))}
                placeholder="1"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="meterValueInterval">Meter Value Interval (seconds)</Label>
              <Input
                id="meterValueInterval"
                type="number"
                value={meterValueInterval}
                onChange={(e) => setMeterValueInterval(Number(e.target.value))}
                placeholder="60"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="ocppVersion">OCPP Version</Label>
              <select
                id="ocppVersion"
                value={ocppVersion}
                onChange={(e) => setOcppVersion(e.target.value)}
                className="w-full mt-1 rounded-md border border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              >
                <option value="1.6">1.6</option>
                <option value="2.0.1">2.0.1</option>
              </select>
            </div>
            <Button onClick={connect} disabled={isConnected} className="w-full">
              {isConnected ? (
                <>
                  <Icons.check className="w-4 h-4 mr-2" />
                  Connected
                </>
              ) : (
                "Connect"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center space-x-4 mb-4">
        <Badge variant={isConnected ? "default" : "secondary"}>
          Connection Status: {isConnected ? "Connected" : "Disconnected"}
        </Badge>
        <Badge variant={isCharging ? "default" : "secondary"}>
          Charging Status: {isCharging ? "Charging" : "Idle"}
        </Badge>
        {transactionId && (
          <Badge>Transaction ID: {transactionId}</Badge>
        )}
      </div>

      <div className="flex space-x-4 mb-4">
        <Button
          onClick={startCharging}
          disabled={!isConnected || isCharging}
          className="bg-green-500 text-white hover:bg-green-700"
        >
          Start Charging
        </Button>
        <Button
          onClick={stopCharging}
          disabled={!isConnected || !isCharging}
          className="bg-red-500 text-white hover:bg-red-700"
        >
          Stop Charging
        </Button>
      </div>

      <Card className="w-full max-w-lg shadow-md rounded-lg">
        <CardHeader className="py-3 px-4 bg-gray-50 border-b">
          <Label className="text-lg font-semibold text-gray-700">Connection Log</Label>
        </CardHeader>
        <CardContent className="p-4">
          <Textarea
            value={connectionLog}
            readOnly
            className="w-full h-48 bg-gray-50 text-sm text-gray-800"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Home;
