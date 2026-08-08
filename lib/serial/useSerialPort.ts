"use client";

import { useCallback, useRef, useState } from "react";

export type SerialPortOptions = {
  baudRate?: number;
};

export const useSerialPort = (onLine: (line: string) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSupported] = useState(
    () => typeof navigator !== "undefined" && "serial" in navigator
  );

  const onLineRef = useRef(onLine);
  onLineRef.current = onLine;

  const portRef = useRef<any>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<string> | null>(null);
  const readableClosedRef = useRef<Promise<void> | null>(null);
  const writableClosedRef = useRef<Promise<void> | null>(null);
  const keepReading = useRef(false);

  const readLoop = useCallback(
    async (reader: ReadableStreamDefaultReader<string>) => {
      let buffer = "";
      try {
        while (keepReading.current) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const clean = line.trim();
            if (clean) onLineRef.current(clean);
          }
        }
      } catch {
        // port dropped, disconnect handles cleanup
      } finally {
        reader.releaseLock();
      }
    },
    []
  );

  const connect = useCallback(
    async (options: SerialPortOptions = {}) => {
      const nav = navigator as any;
      if (!nav.serial) {
        alert("web serial is not supported in this browser");
        return;
      }

      try {
        const port = await nav.serial.requestPort();
        await port.open({ baudRate: options.baudRate ?? 115200 });
        portRef.current = port;
        keepReading.current = true;

        const decoder = new TextDecoderStream();
        readableClosedRef.current = port.readable.pipeTo(decoder.writable);
        const reader = decoder.readable.getReader();
        readerRef.current = reader;

        const encoder = new TextEncoderStream();
        writableClosedRef.current = encoder.readable.pipeTo(port.writable);
        writerRef.current = encoder.writable.getWriter();

        setIsConnected(true);
        readLoop(reader);
      } catch (err) {
        console.error("serial connect failed", err);
        setIsConnected(false);
      }
    },
    [readLoop]
  );

  const disconnect = useCallback(async () => {
    keepReading.current = false;
    try {
      if (readerRef.current) {
        await readerRef.current.cancel();
        readerRef.current = null;
      }
      if (writerRef.current) {
        await writerRef.current.close();
        writerRef.current = null;
      }
      if (readableClosedRef.current) {
        await readableClosedRef.current.catch(() => {});
        readableClosedRef.current = null;
      }
      if (writableClosedRef.current) {
        await writableClosedRef.current.catch(() => {});
        writableClosedRef.current = null;
      }
      if (portRef.current) {
        await portRef.current.close();
        portRef.current = null;
      }
    } catch (err) {
      console.error("serial disconnect error", err);
    } finally {
      setIsConnected(false);
    }
  }, []);

  const sendCommand = useCallback(async (cmd: string) => {
    if (!writerRef.current) return;
    try {
      await writerRef.current.write(cmd + "\r\n");
    } catch (err) {
      console.error("serial write error", err);
    }
  }, []);

  return { isConnected, isSupported, connect, disconnect, sendCommand };
};
