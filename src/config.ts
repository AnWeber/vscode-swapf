import * as vscode from 'vscode';

export function getConfig(): SwapFConfiguration {
  return vscode.workspace.getConfiguration('swapf');
}

export interface SwapFConfiguration {
  get(section: 'patterns'): Array<SwapFAlternative> | undefined;
  get(section: 'textDocumentShowOptions'): vscode.TextDocumentShowOptions | undefined;
}

export interface SwapFAlternative {
  pattern: string | undefined;
  alternatives: Array<string>;
  force: boolean;
  createFiles?: Record<string, boolean>;
}
