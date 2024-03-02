import * as vscode from 'vscode';
import { DisposeProvider } from './disposeProvider';
import { SwapFAlternative, getConfig } from '../config';

type RegexSwapAlternative = SwapFAlternative & { regex: RegExp };

type PatternSearchResult = {
  pattern: RegexSwapAlternative;
  groups: Record<string, string>;
};

export class CommandsProvider extends DisposeProvider {
  #currentUris: Array<vscode.Uri> | undefined;
  #patterns: Array<RegexSwapAlternative>;
  #channel: vscode.OutputChannel;
  constructor() {
    super();

    const getPatterns = () =>
      getConfig()
        .get('patterns')
        ?.filter(obj => !!obj.pattern)
        ?.map(obj => ({ ...obj, regex: new RegExp(obj.pattern || '', 'u') })) || [];
    this.#patterns = getPatterns();

    this.#channel = vscode.window.createOutputChannel('SwapF');

    this.subscriptions = [
      vscode.workspace.onDidChangeConfiguration(evt => {
        if (evt.affectsConfiguration('swapf')) {
          this.#patterns = getPatterns();
          this.onDidChangeActiveTextEditor(vscode.window.activeTextEditor);
        }
      }),
      vscode.window.onDidChangeActiveTextEditor(this.onDidChangeActiveTextEditor, this),
      vscode.commands.registerCommand('swapf.swap', this.swapRight, this),
      vscode.commands.registerCommand('swapf.swapPick', this.swapPick, this),
      vscode.commands.registerCommand('swapf.swapRight', this.swapRight, this),
      vscode.commands.registerCommand('swapf.swapLeft', this.swapLeft, this),
      vscode.commands.registerCommand('swapf.createSwapFiles', this.createSwapFiles, this),
    ];
    this.onDidChangeActiveTextEditor(vscode.window.activeTextEditor);
  }

  private async onDidChangeActiveTextEditor(textEditor: vscode.TextEditor | undefined): Promise<void> {
    this.setSwapfContext({
      hasAlternatives: false,
      hasPatterns: false,
    });
    const uri = textEditor?.document?.uri;
    if (!uri) {
      return;
    }
    if (this.#currentUris?.some(obj => this.equalsUri(obj, uri))) {
      return;
    }
    this.#currentUris = undefined;

    const patterns = this.getPatternsForUri(uri);

    const uris = await this.findUrisForRelativeFile(patterns);
    if (uris.length > 1) {
      this.setSwapfContext({
        hasAlternatives: true,
        hasPatterns: true,
      });
      this.#currentUris = uris;
    } else if (patterns.length > 0) {
      this.setSwapfContext({
        hasAlternatives: false,
        hasPatterns: true,
      });
    }
  }

  private equalsUri(uri1: vscode.Uri, uri2: vscode.Uri) {
    return uri1.toString() === uri2.toString();
  }

  private async findUrisForRelativeFile(searchResults: Array<PatternSearchResult>) {
    const result: Array<vscode.Uri> = [];

    let isPatternMatch = false;
    for (const s of searchResults) {
      const pattern = s.pattern;
      if (result.length === 0 || pattern.force) {
        isPatternMatch = true;
        this.logMatchGroups(pattern, s.groups);
        for (const alternative of pattern.alternatives) {
          const replaced = this.replaceVars(alternative, s.groups);
          const uris = await this.findNonIgnoredFiles(replaced);
          this.#channel.appendLine(`  found ${uris.length} alternative for ${replaced}`);
          result.push(...uris);
          for (const uri of uris) {
            this.#channel.appendLine(`    ${uri.toString()}`);
          }
        }
      }
    }
    if (!isPatternMatch) {
      this.#channel.appendLine(`  no pattern matched`);
    }
    return result.filter((obj, index, array) => array.findIndex(o => this.equalsUri(o, obj)) === index);
  }

  private getPatternsForUri(uri: vscode.Uri): Array<PatternSearchResult> {
    const relativeFile = this.getRelativeFilePath(uri);
    if (!relativeFile) {
      return [];
    }
    const result: Array<PatternSearchResult> = [];
    for (const pattern of this.#patterns) {
      const match = pattern.regex.exec(relativeFile);
      if (match?.groups && pattern.alternatives) {
        result.push({
          pattern,
          groups: match.groups,
        });
      }
    }
    return result;
  }

  private logMatchGroups(pattern: SwapFAlternative & { regex: RegExp }, groups: Record<string, string>) {
    this.#channel.appendLine(`  matches ${pattern.pattern}`);
    for (const [key, value] of Object.entries(groups)) {
      this.#channel.appendLine(`    ${key}=${value}`);
    }
  }

  private replaceVars(alternative: string, values: Record<string, string>) {
    let result = alternative;
    for (const [key, val] of Object.entries(values)) {
      result = result.replace(`<${key}>`, val);
    }
    return result;
  }

  private setSwapfContext(context: { hasAlternatives: boolean; hasPatterns: boolean }) {
    for (const [key, value] of Object.entries(context)) {
      vscode.commands.executeCommand('setContext', `swapf.${key}`, value);
    }
  }

  private async findNonIgnoredFiles(pattern: vscode.GlobPattern) {
    const exclude = [
      ...Object.keys((await vscode.workspace.getConfiguration('search', null).get('exclude')) || {}),
      ...Object.keys((await vscode.workspace.getConfiguration('files', null).get('exclude')) || {}),
    ].join(',');

    return await vscode.workspace.findFiles(pattern, `{${exclude}}`);
  }

  private getRelativeFilePath(uri: vscode.Uri) {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    if (workspaceFolder) {
      return uri.toString().replace(`${workspaceFolder.uri.toString()}/`, '');
    }
    return uri.toString();
  }

  private async swapRight() {
    const index = this.getCurrentIndex();
    if (index >= 0 && this.#currentUris) {
      let next = index + 1;
      if (next >= this.#currentUris.length) {
        next = 0;
      }
      const nextUri = this.#currentUris[next];
      await this.openUri(nextUri);
    }
  }

  private async swapLeft() {
    const index = this.getCurrentIndex();
    if (index >= 0 && this.#currentUris) {
      let next = index - 1;
      if (next < 0) {
        next = this.#currentUris.length - 1;
      }
      const nextUri = this.#currentUris[next];
      await this.openUri(nextUri);
    }
  }

  private async swapPick() {
    if (this.#currentUris) {
      const picks = this.#currentUris.map(uri => ({ uri, label: uri.toString(), picked: true }));
      const selectedPicks = await vscode.window.showQuickPick(picks, {
        canPickMany: true,
      });

      if (selectedPicks) {
        for (const pick of selectedPicks) {
          await this.openUri(pick.uri, { preview: false });
        }
      }
    }
  }

  private async openUri(uri: vscode.Uri, options?: vscode.TextDocumentShowOptions): Promise<void> {
    await vscode.window.showTextDocument(uri, Object.assign({}, getConfig().get('textDocumentShowOptions'), options));
  }

  private getCurrentIndex() {
    const uri = vscode.window.activeTextEditor?.document?.uri;
    if (!uri || !this.#currentUris) {
      return -1;
    }

    return this.#currentUris.findIndex(obj => this.equalsUri(obj, uri));
  }

  public async createSwapFiles() {
    const uri = vscode.window.activeTextEditor?.document?.uri;
    if (!uri) {
      return;
    }
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    const patterns = this.getPatternsForUri(uri);

    for (const p of patterns) {
      const picks = await this.getValidPicks(p, workspaceFolder?.uri);
      if (!picks) {
        continue;
      }
      const selectedPicks = await vscode.window.showQuickPick(picks, {
        canPickMany: true,
      });
      if (!selectedPicks) {
        return;
      }

      for (const pick of selectedPicks) {
        try {
          await vscode.workspace.fs.writeFile(pick.uri, new Uint8Array(0));
        } catch (err) {
          this.#channel.appendLine(`${err}`);
        }
      }
      return;
    }
  }

  private async getValidPicks({ pattern, groups }: PatternSearchResult, baseUri?: vscode.Uri) {
    if (!pattern.createFiles) {
      return undefined;
    }
    const picks = Object.entries(pattern.createFiles)
      ?.map(([file, picked]) => ({ label: this.replaceVars(file, groups), picked }))
      .map(obj => ({
        ...obj,
        uri: baseUri ? vscode.Uri.joinPath(baseUri, obj.label) : vscode.Uri.file(obj.label),
      }));
    const result = [];
    for (const p of picks) {
      try {
        await vscode.workspace.fs.stat(p.uri);
      } catch {
        result.push(p);
      }
    }
    return result;
  }
}
