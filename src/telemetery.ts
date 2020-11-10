import * as vscode from 'vscode';
import TelemetryReporter from 'vscode-extension-telemetry';
import secrets from './secrets';
// all events will be prefixed with this event name
const extensionId = 'divyanshuagrawal.competitive-programming-helper';

// extension version will be reported as a property with each event
const extensionVersion = vscode.extensions.getExtension(extensionId)
    ?.packageJSON.version;

if (extensionVersion === undefined) {
    console.error('Telemetery could not find extension');
}

// the application insights key (also known as instrumentation key). Replace with your own key.
const key = secrets.appInsightsKey;

// telemetry reporter
let reporter: TelemetryReporter | null = null;

export const createTelemeteryReporter = (context: vscode.ExtensionContext) => {
    if (key === '') {
        console.log(
            'Telemeter reporter ceation skipped ( Reason : Empty key )',
        );
        return;
    }
    console.log('Telemetery reporter created');
    reporter = new TelemetryReporter(extensionId, extensionVersion, key);
    sendTelemetryEvent('extension-launched');
    context.subscriptions.push(reporter);
};

export const destroyTelemeteryReporter = () => {
    if (reporter !== null) {
        reporter.dispose();
        reporter = null;
    }
};

export const sendTelemetryEvent = (
    eventName: string,
    properties?: {
        [key: string]: string;
    },
    measurements?: {
        [key: string]: number;
    },
): void => {
    if (reporter === null) {
        return;
    }
    console.log('Sent telemetery event', eventName);
    reporter.sendTelemetryEvent(eventName, properties, measurements);
};

export default sendTelemetryEvent;
