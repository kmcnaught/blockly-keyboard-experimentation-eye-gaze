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
    // Block text (from Maze.*)
    MAZE_MOVE_FORWARD: 'move forward',
    MAZE_TURN_LEFT: 'turn left',
    MAZE_TURN_RIGHT: 'turn right',
    MAZE_PATH_AHEAD: 'if path ahead',
    MAZE_PATH_LEFT: 'if path to the left',
    MAZE_PATH_RIGHT: 'if path to the right',
    MAZE_DO: 'do',
    MAZE_ELSE: 'else',
    MAZE_REPEAT_UNTIL: 'repeat until',

    // Tooltips (from Maze.*)
    MAZE_MOVE_FORWARD_TOOLTIP: 'Moves the player forward one space.',
    MAZE_TURN_TOOLTIP: 'Turns the player left or right by 90 degrees.',
    MAZE_IF_TOOLTIP: 'If there is a path in the specified direction, then do some actions.',
    MAZE_IFELSE_TOOLTIP:
      'If there is a path in the specified direction, then do the first block of actions. Otherwise, do the second block of actions.',
    MAZE_WHILE_TOOLTIP: 'Repeat the enclosed actions until finish point is reached.',

    // UI strings (from Games.*)
    MAZE_TITLE: 'Maze',
    MAZE_RUN_PROGRAM: 'Run Program',
    MAZE_RESET_PROGRAM: 'Reset',
    MAZE_LEVEL: 'Level',

    // Capacity (simplified from Maze.capacity0/1/2)
    MAZE_CAPACITY: 'You have %1 blocks left.',
    MAZE_CAPACITY_1: 'You have %1 block left.',

    // Alert messages (from Games.congratulations, extra for failure/timeout)
    MAZE_CONGRATULATIONS: 'Congratulations!',
    MAZE_FAILURE_MESSAGE: 'Program finished, but you did not reach the goal.',
    MAZE_TIMEOUT_MESSAGE: 'Program took too long to run. Check for infinite loops.',

    // Hints (from Maze.help*)
    MAZE_HINT_STACK: 'Stack a couple of \'move forward\' blocks together to help me reach the goal.',
    MAZE_HINT_ONE_TOP_BLOCK: 'On this level, you need to stack together all of the blocks in the white workspace.',
    MAZE_HINT_RUN: 'Run your program to see what happens.',
    MAZE_HINT_RESET: 'Your program didn\'t solve the maze. Press \'Reset\' and try again.',
    MAZE_HINT_REPEAT: 'Reach the end of this path using only two blocks. Use \'repeat\' to run a block more than once.',
    MAZE_HINT_CAPACITY: 'You have used up all the blocks for this level. To create a new block, you first need to delete an existing block.',
    MAZE_HINT_REPEAT_MANY: 'You can fit more than one block inside a \'repeat\' block.',
    MAZE_HINT_IF: 'An \'if\' block will do something only if the condition is true. Try turning left if there is a path to the left.',
    MAZE_HINT_MENU: 'Click on %1 in the \'if\' block to change its condition.',
    MAZE_HINT_IF_ELSE: 'If-else blocks will do one thing or the other.',
    MAZE_HINT_WALL_FOLLOW: 'Can you solve this complicated maze? Try following the left-hand wall. Advanced programmers only!',
  },

  fr: {
    // Block text (from Maze.*)
    MAZE_MOVE_FORWARD: 'avancer',
    MAZE_TURN_LEFT: 'tourner à gauche',
    MAZE_TURN_RIGHT: 'tourner à droite',
    MAZE_PATH_AHEAD: 'si chemin devant',
    MAZE_PATH_LEFT: 'si chemin vers la gauche',
    MAZE_PATH_RIGHT: 'si chemin vers la droite',
    MAZE_DO: 'faire',
    MAZE_ELSE: 'sinon',
    MAZE_REPEAT_UNTIL: 'répéter jusqu\'à',

    // Tooltips (from Maze.*)
    MAZE_MOVE_FORWARD_TOOLTIP: 'Avance le joueur d\'une case.',
    MAZE_TURN_TOOLTIP: 'Tourne le joueur à gauche ou à droite de 90 degrés.',
    MAZE_IF_TOOLTIP:
      'S\'il y a un chemin dans la direction spécifiée, alors effectue ces actions.',
    MAZE_IFELSE_TOOLTIP:
      'S\'il y a un chemin dans la direction spécifiée, alors fais le premier bloc d\'actions. Sinon fais le second bloc d\'actions.',
    MAZE_WHILE_TOOLTIP:
      'Répète les actions à l\'intérieur du bloc jusqu\'à atteindre le but final.',

    // UI strings (from Games.*)
    MAZE_TITLE: 'Labyrinthe',
    MAZE_RUN_PROGRAM: 'Exécuter le programme',
    MAZE_RESET_PROGRAM: 'Réinitialiser',
    MAZE_LEVEL: 'Niveau',

    // Capacity (simplified from Maze.capacity0/1/2)
    MAZE_CAPACITY: 'Vous avez %1 blocs restants.',
    MAZE_CAPACITY_1: 'Vous avez %1 bloc restant.',

    // Alert messages (from Games.congratulations, extra for failure/timeout)
    MAZE_CONGRATULATIONS: 'Félicitations !',
    MAZE_FAILURE_MESSAGE: 'Le programme est terminé, mais vous n\'avez pas atteint l\'objectif.',
    MAZE_TIMEOUT_MESSAGE: 'Le programme a pris trop de temps. Vérifiez les boucles infinies.',

    // Hints (from Maze.help*)
    MAZE_HINT_STACK: 'Empilez quelques blocs « avancer » ensemble pour m\'aider à atteindre l\'objectif.',
    MAZE_HINT_ONE_TOP_BLOCK: 'À ce niveau, vous devez empiler tous les blocs ensemble dans l\'espace de travail blanc.',
    MAZE_HINT_RUN: 'Exécutez votre programme pour voir ce qui se passe.',
    MAZE_HINT_RESET: 'Votre programme n\'a pas résolu le labyrinthe. Appuyez sur « Réinitialiser » et réessayez.',
    MAZE_HINT_REPEAT: 'Atteignez la fin de ce chemin avec seulement deux blocs. Utilisez « répéter » pour exécuter un bloc plusieurs fois.',
    MAZE_HINT_CAPACITY: 'Vous avez utilisé tous les blocs pour ce niveau. Pour créer un nouveau bloc, vous devez d\'abord supprimer un bloc existant.',
    MAZE_HINT_REPEAT_MANY: 'Vous pouvez mettre plus d\'un bloc à l\'intérieur d\'un bloc « répéter ».',
    MAZE_HINT_IF: 'Un bloc « si » ne fera quelque chose que si la condition est vraie. Essayez de tourner à gauche s\'il y a un chemin vers la gauche.',
    MAZE_HINT_MENU: 'Cliquez sur %1 dans le bloc « si » pour changer sa condition.',
    MAZE_HINT_IF_ELSE: 'Les blocs si-sinon feront une chose ou l\'autre.',
    MAZE_HINT_WALL_FOLLOW: 'Pouvez-vous résoudre ce labyrinthe compliqué ? Essayez de suivre le mur de gauche. Réservé aux programmeurs avancés !',
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
