import * as vscode from 'vscode';
import * as provider from './provider';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(...[new provider.CommandsProvider()]);
}
