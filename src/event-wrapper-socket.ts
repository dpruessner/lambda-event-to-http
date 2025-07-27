import { Duplex } from 'stream';
import { type AddressInfo, type Socket, type SocketReadyState } from 'net';
import { createDebugger, prettyPrintBuffer } from './util';

const debug = createDebugger('EventWrapperSocket');

export type EventWrapperSocketOptions = {
    isHttps?: boolean;
    localAddress?: string;
    localPort?: number;
    localFamily?: string;
    remoteAddress?: string;
}

// EventWrapperSocket: a stub for a net.Socket that emits body data as stream events
export class EventWrapperSocket extends Duplex implements Socket {
    protected _debug: (...args: any[]) => void;

    // Source for request body
    private _readBody?: Buffer | string | undefined;
    private _readOffset: number = 0;
    private _localPort: number | undefined;
    private _timeout: BasicTimeout | undefined;

    // Sink for response body
    private _writeBodyAccumulator: Buffer[] = [];

    constructor(body?: Buffer | string | undefined, options: EventWrapperSocketOptions = {}) {
        super();
        this._debug = createDebugger('EventWrapperSocket');
        this._debug('constructor');
        this._readBody = body;
        this._localPort = options.localPort || (options.isHttps ? 443 : 80);
        this.localFamily = options.localFamily || 'IPv4';
        this.localAddress = options.localAddress || '127.0.0.1';
        this.remoteAddress = options.remoteAddress || '127.0.0.1';
        this.remoteFamily = options.localFamily || 'IPv4';
        this.remotePort = 65534;

        this.on('end', () => {
            this._debug('end');
        });
    }

    destroySoon(): void {
        throw new Error('Method not implemented.');
    }
    
    connect(port: unknown, host?: unknown, connectionListener?: unknown): this {
        throw new Error('Method not implemented.');
    }
    
    resetAndDestroy(): this {
        super.destroy();
        return this;
    }

    // Register timeout
    setTimeout(timeout: number, callback?: () => void): this {
        if (timeout === 0) {
            this._timeout?.cancel();
            return this;
        }

        this._timeout?.cancel();
        let cb = () => {
            this.emit('timeout');
            callback?.();
            this._timeout = undefined;
        }
        this._timeout = new BasicTimeout(cb, timeout);
        return this;
    }
    
    // No-op: there is no socket
    setNoDelay(noDelay?: boolean): this {
        console.log('@deprecated: setNoDelay', noDelay);
        return this;
    }
    
    // No-op: there is no socket
    setKeepAlive(enable?: boolean, initialDelay?: number): this {
        console.log('@deprecated: setKeepAlive', enable, initialDelay);
        return this;
    }

    address(): AddressInfo | {} {
        return {
            address: this.localAddress || '127.0.0.1',
            port: this.localPort,
            family: this.localFamily,
        };
    }
    
    unref(): this {
        debug('unref(): NOT IMPLEMENTED');
        return this;
    }
    
    ref(): this {
        debug('ref(): NOT IMPLEMENTED');
        return this;
    }

    autoSelectFamilyAttemptedAddresses: string[] = [];
    bufferSize: number = 4096;

    get bytesRead(): number {
        return this._readOffset;
    }
    
    public bytesWritten: number = 0;

    connecting: boolean = false;
    pending: boolean = false;

    localAddress?: string | undefined = undefined;

    get localPort(): number | undefined {
        return this._localPort;
    }

    localFamily?: string | undefined = undefined;
    readyState: SocketReadyState = "open";
    remoteAddress?: string | undefined = undefined;
    remoteFamily?: string | undefined = undefined;
    remotePort?: number | undefined = undefined;
    timeout?: number | undefined = undefined;

    override _read(size: number) {
        this._debug('read', size);
        if (!this._readBody || this._readOffset >= this._readBody.length) {
            debug('read after end-of-buffer; pushing null');
            this.push(null);
            return;
        }

        let chunk = this._readBody.slice(this._readOffset, this._readOffset + size);
        this._debug('read', prettyPrintBuffer(chunk));
        this.push(chunk);
        this._readOffset += chunk.length;
        if (this._readOffset >= this._readBody.length) {
            debug('read exceeded end-of-buffer; pushing null');
            this.push(null);
        }
    }

    override _write(chunk: Buffer | string, encoding: string, callback: (error?: Error | null) => void) {
        this._debug('write', prettyPrintBuffer(chunk), encoding);

        // Refresh the timeout on `write`
        this._timeout?.refresh();

        if (typeof chunk === 'string') {
            // Looks like the Node documentation is not good here?
            // @ts-ignore
            this._writeBodyAccumulator.push(Buffer.from(chunk as string, encoding));
            this.bytesWritten += chunk.length;
        }
        else {
            this._writeBodyAccumulator.push(chunk);
            this.bytesWritten += chunk.length;
        }

        callback();
    }

    _writeBufferContents(): Buffer {
        return Buffer.concat(this._writeBodyAccumulator);
    }
} 


/**
 * Basic timeout that will trigger only once
 */
class BasicTimeout {
    private _timeout: NodeJS.Timeout | undefined;
    private _callback: (() => void) | undefined;
    private _timeoutMs: number;

    constructor(callback: () => void, timeoutMs: number) {
        this._callback = () => {
            try {
                callback();
            } catch (e) {
                throw e;
            } finally {
                this._callback = undefined;
                this._timeout = undefined;
            }
        }
        if (timeoutMs <= 0) {
            throw new Error('Timeout must be greater than 0');
        }
        this._timeoutMs = timeoutMs;
        this._timeout = setTimeout(this._callback, this._timeoutMs);
    }

    refresh() {
        if (this._timeout) {
            this._timeout.refresh();
        } 
    }
    
    cancel() {
        if (this._timeout) {
            clearTimeout(this._timeout);
            this._timeout = undefined;
        }
    }
}