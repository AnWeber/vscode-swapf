import * as vscode from 'vscode';

export function getConfig(): SwapFConfiguration {
  return vscode.workspace.getConfiguration('swapf');
}

export interface SwapFConfiguration {
  get(section: 'patterns'): Array<SwapFAlternative> | undefined;
}

export interface SwapFAlternative {
  pattern: string | undefined;
  alternatives: Array<string>;
}
