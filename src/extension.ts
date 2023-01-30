
import * as vscode from 'vscode';

import { Client } from './client';
import { initDecorations } from './editor/decorations';

import { PerformanceSessionEditorProvider } from './editor/sessioneditor';

export let client: Client;

export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(PerformanceSessionEditorProvider.register(context));

	initDecorations();

	client = new Client();
	client.start();
}

export function deactivate() {
	if (client === undefined) {
		return;
	}
	client.stop();
}
