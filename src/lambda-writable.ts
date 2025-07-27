import { Writable } from 'stream';
import { createDebugger, prettyPrintBuffer } from './util';

export class EventResponseBodyWriter extends Writable {
    private _writeBodyAccumulator: Buffer[] = [];
    bytesWritten: number = 0;

    protected _debug = createDebugger('EventResponseBodyWriter');

    constructor() {
        super();
        this._debug('constructor');

        this.on('finish', () => {
            this._debug('finish');
        });

        this.on('end', () => {
            this._debug('end');
        });
    }

    override _write(chunk: Buffer | string, encoding: string, callback: (error?: Error | null) => void) {
        this._debug('write', prettyPrintBuffer(chunk), encoding);
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

    get body(): Buffer {
        return Buffer.concat(this._writeBodyAccumulator);
    }
} 