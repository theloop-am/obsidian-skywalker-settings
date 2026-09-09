/*
 * Skywalker Settings - Plugin for Obsidian
 * Copyright (c) 2026 theLOOP
 * SPDX-License-Identifier: MIT
 */

import { Notice } from 'obsidian';

/** A single boundary for messages displayed by the plugin. */
export function notify(message: string): void {
  new Notice(message);
}
