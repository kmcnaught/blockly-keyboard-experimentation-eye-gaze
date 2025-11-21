/**
 * @license
 * Copyright 2012 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Internationalization (i18n) messages for Maze game.
 * Adapted from blockly-games translations.
 */

import * as Blockly from 'blockly/core';

/**
 * Supported languages for the maze game
 */
export type SupportedLocale = 'en' | 'fr';

/**
 * Message definitions for all supported languages
 */
const MESSAGES: Record<SupportedLocale, Record<string, string>> = {
  en: {
    // Block text
    MAZE_MOVE_FORWARD: 'move forward',
    MAZE_TURN_LEFT: 'turn left',
    MAZE_TURN_RIGHT: 'turn right',
    MAZE_PATH_AHEAD: 'if path ahead',
    MAZE_PATH_LEFT: 'if path to the left',
    MAZE_PATH_RIGHT: 'if path to the right',
    MAZE_DO: 'do',
    MAZE_ELSE: 'else',
    MAZE_REPEAT_UNTIL: 'repeat until',

    // Tooltips
    MAZE_MOVE_FORWARD_TOOLTIP: 'Moves the player forward one space.',
    MAZE_TURN_TOOLTIP: 'Turns the player left or right by 90 degrees.',
    MAZE_IF_TOOLTIP: 'If there is a path in the specified direction, then do some actions.',
    MAZE_IFELSE_TOOLTIP:
      'If there is a path in the specified direction, then do the first block of actions. Otherwise, do the second block of actions.',
    MAZE_WHILE_TOOLTIP: 'Repeat the enclosed actions until the finish point is reached.',

    // UI strings
    MAZE_RUN_PROGRAM: 'Run Program',
    MAZE_RESET_PROGRAM: 'Reset',
    MAZE_CAPACITY: 'You have %1 blocks left.',
    MAZE_CONGRATULATIONS: 'Congratulations!',
  },

  fr: {
    // Block text
    MAZE_MOVE_FORWARD: 'avancer',
    MAZE_TURN_LEFT: 'tourner à gauche',
    MAZE_TURN_RIGHT: 'tourner à droite',
    MAZE_PATH_AHEAD: 'si chemin devant',
    MAZE_PATH_LEFT: 'si chemin vers la gauche',
    MAZE_PATH_RIGHT: 'si chemin vers la droite',
    MAZE_DO: 'faire',
    MAZE_ELSE: 'sinon',
    MAZE_REPEAT_UNTIL: 'répéter jusqu\'à',

    // Tooltips
    MAZE_MOVE_FORWARD_TOOLTIP: 'Avance le joueur d\'une case.',
    MAZE_TURN_TOOLTIP: 'Tourne le joueur à gauche ou à droite de 90 degrés.',
    MAZE_IF_TOOLTIP:
      'S\'il y a un chemin dans la direction spécifiée, alors effectue ces actions.',
    MAZE_IFELSE_TOOLTIP:
      'S\'il y a un chemin dans la direction spécifiée, alors fais le premier bloc d\'actions. Sinon fais le second bloc d\'actions.',
    MAZE_WHILE_TOOLTIP:
      'Répète les actions à l\'intérieur du bloc jusqu\'à atteindre le but final.',

    // UI strings
    MAZE_RUN_PROGRAM: 'Exécuter le programme',
    MAZE_RESET_PROGRAM: 'Réinitialiser',
    MAZE_CAPACITY: 'Il vous reste %1 blocs.',
    MAZE_CONGRATULATIONS: 'Félicitations !',
  },
};

/**
 * Load messages for the specified locale into Blockly.Msg
 * @param locale The locale to load (defaults to 'en')
 */
export function loadMessages(locale: SupportedLocale = 'en'): void {
  const messages = MESSAGES[locale];

  if (!messages) {
    console.warn(`Locale '${locale}' not supported, falling back to English`);
    locale = 'en';
  }

  // Load all messages into Blockly.Msg
  Object.entries(MESSAGES[locale]).forEach(([key, value]) => {
    Blockly.Msg[key] = value;
  });

  console.log(`Loaded maze game messages for locale: ${locale}`);
}

/**
 * Get the current browser locale, or default to English
 * @returns A supported locale code
 */
export function getBrowserLocale(): SupportedLocale {
  const browserLang = navigator.language || (navigator as any).userLanguage || 'en';
  const langCode = browserLang.toLowerCase().split('-')[0];

  // Check if we support this language
  if (langCode === 'fr') {
    return 'fr';
  }

  // Default to English
  return 'en';
}
