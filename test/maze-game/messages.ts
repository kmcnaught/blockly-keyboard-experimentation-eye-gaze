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

    // UI strings (from Games.*)
    MAZE_RUN_PROGRAM: 'Run Program',
    MAZE_RESET_PROGRAM: 'Reset',
    MAZE_CAPACITY: 'You have %1 blocks left.',
    MAZE_CONGRATULATIONS: 'Congratulations!',

    // Page UI
    MAZE_TITLE: 'Maze',
    MAZE_SUBTITLE: 'Navigate the maze using Blockly blocks with full keyboard and eye gaze support',
    MAZE_CHARACTER_LABEL: 'Character:',
    MAZE_LANGUAGE_LABEL: 'Language:',

    // Level display
    MAZE_LEVEL: 'Level',
    MAZE_LEVEL_COUNTER: 'Level %1 of %2',
    MAZE_LEVEL_WITH_TITLE: 'Level %1: %2',

    // Instructions
    MAZE_GOAL_LABEL: 'Goal:',
    MAZE_GOAL_DESCRIPTION: 'Program the blue player to reach the green goal.',
    MAZE_AVAILABLE_BLOCKS_LABEL: 'Available blocks:',

    // Keyboard help
    MAZE_KEYBOARD_NAV_LABEL: 'Keyboard Navigation:',
    MAZE_KEYBOARD_HELP_1: 'Tab to focus on Blockly workspace',
    MAZE_KEYBOARD_HELP_2: 'Arrow keys to navigate blocks',
    MAZE_KEYBOARD_HELP_3: 'Enter to edit or connect blocks',
    MAZE_KEYBOARD_HELP_4: 'Press / for help menu',

    // Level titles
    MAZE_LEVEL_1_TITLE: 'Straight Path',
    MAZE_LEVEL_2_TITLE: 'Single Turn',
    MAZE_LEVEL_3_TITLE: 'Multiple Turns',
    MAZE_LEVEL_4_TITLE: 'S-Curve',
    MAZE_LEVEL_5_TITLE: 'T-Junction',
    MAZE_LEVEL_6_TITLE: 'Zigzag Path',
    MAZE_LEVEL_7_TITLE: 'Decision Points',
    MAZE_LEVEL_8_TITLE: 'Complex Maze',

    // Character names
    MAZE_SKIN_ASTRO: 'Astro',
    MAZE_SKIN_WHEELCHAIR: 'Wheelchair user',
    MAZE_SKIN_PANDA: 'Panda',
    MAZE_SKIN_PEGMAN: 'Pegman',

    // Alert messages
    MAZE_ALERT_ALREADY_RUNNING: 'Already executing!',
    MAZE_SUCCESS_MESSAGE: 'Success! You reached the goal!',
    MAZE_FAILURE_MESSAGE: 'Program finished, but you did not reach the goal.',
    MAZE_TIMEOUT_MESSAGE: 'Program took too long to run. Check for infinite loops.',
    MAZE_ERROR_MESSAGE: 'Error executing code: ',
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

    // UI strings (from Games.*)
    MAZE_RUN_PROGRAM: 'Exécuter le programme',
    MAZE_RESET_PROGRAM: 'Réinitialiser',
    MAZE_CAPACITY: 'Il vous reste %1 blocs.',
    MAZE_CONGRATULATIONS: 'Félicitations !',

    // Page UI
    MAZE_TITLE: 'Labyrinthe',
    MAZE_SUBTITLE: 'Naviguez dans le labyrinthe en utilisant des blocs Blockly avec clavier et suivi du regard',
    MAZE_CHARACTER_LABEL: 'Personnage :',
    MAZE_LANGUAGE_LABEL: 'Langue :',

    // Level display
    MAZE_LEVEL: 'Niveau',
    MAZE_LEVEL_COUNTER: 'Niveau %1 sur %2',
    MAZE_LEVEL_WITH_TITLE: 'Niveau %1 : %2',

    // Instructions
    MAZE_GOAL_LABEL: 'Objectif :',
    MAZE_GOAL_DESCRIPTION: 'Programmez le joueur bleu pour atteindre l\'objectif vert.',
    MAZE_AVAILABLE_BLOCKS_LABEL: 'Blocs disponibles :',

    // Keyboard help
    MAZE_KEYBOARD_NAV_LABEL: 'Navigation au clavier :',
    MAZE_KEYBOARD_HELP_1: 'Tab pour se concentrer sur l\'espace de travail Blockly',
    MAZE_KEYBOARD_HELP_2: 'Touches fléchées pour naviguer entre les blocs',
    MAZE_KEYBOARD_HELP_3: 'Entrée pour éditer ou connecter des blocs',
    MAZE_KEYBOARD_HELP_4: 'Appuyez sur / pour le menu d\'aide',

    // Level titles
    MAZE_LEVEL_1_TITLE: 'Chemin droit',
    MAZE_LEVEL_2_TITLE: 'Un seul virage',
    MAZE_LEVEL_3_TITLE: 'Plusieurs virages',
    MAZE_LEVEL_4_TITLE: 'Courbe en S',
    MAZE_LEVEL_5_TITLE: 'Jonction en T',
    MAZE_LEVEL_6_TITLE: 'Chemin en zigzag',
    MAZE_LEVEL_7_TITLE: 'Points de décision',
    MAZE_LEVEL_8_TITLE: 'Labyrinthe complexe',

    // Character names
    MAZE_SKIN_ASTRO: 'Astro',
    MAZE_SKIN_WHEELCHAIR: 'Utilisateur de fauteuil roulant',
    MAZE_SKIN_PANDA: 'Panda',
    MAZE_SKIN_PEGMAN: 'Pegman',

    // Alert messages
    MAZE_ALERT_ALREADY_RUNNING: 'Déjà en cours d\'exécution !',
    MAZE_SUCCESS_MESSAGE: 'Succès ! Vous avez atteint l\'objectif !',
    MAZE_FAILURE_MESSAGE: 'Le programme est terminé, mais vous n\'avez pas atteint l\'objectif.',
    MAZE_TIMEOUT_MESSAGE: 'Le programme a pris trop de temps. Vérifiez les boucles infinies.',
    MAZE_ERROR_MESSAGE: 'Erreur lors de l\'exécution du code : ',
  },
};

/**
 * Current locale being used
 */
let currentLocale: SupportedLocale = 'en';

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

  currentLocale = locale;

  // Load all messages into Blockly.Msg
  Object.entries(MESSAGES[locale]).forEach(([key, value]) => {
    Blockly.Msg[key] = value;
  });

  console.log(`Loaded maze game messages for locale: ${locale}`);
}

/**
 * Get a message by key from the current locale
 * @param key The message key
 * @param params Optional parameters to replace %1, %2, etc.
 * @returns The localized message
 */
export function msg(key: string, ...params: (string | number)[]): string {
  let message = MESSAGES[currentLocale]?.[key] || MESSAGES['en'][key] || key;

  // Replace parameters %1, %2, etc.
  params.forEach((param, index) => {
    message = message.replace(`%${index + 1}`, String(param));
  });

  return message;
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
