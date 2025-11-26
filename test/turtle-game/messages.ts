/**
 * @license
 * Copyright 2012 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Internationalization (i18n) messages for Turtle game.
 * Adapted from blockly-games translations.
 */

import * as Blockly from 'blockly/core';

/**
 * Supported languages for the turtle game
 */
export type SupportedLocale = 'en' | 'fr';

/**
 * Message definitions for all supported languages
 */
const MESSAGES: Record<SupportedLocale, Record<string, string>> = {
  en: {
    // Block text and tooltips
    TURTLE_MOVE_TOOLTIP: 'Moves the turtle forward or backward by the specified amount.',
    TURTLE_MOVE_FORWARD: 'move forward by',
    TURTLE_MOVE_BACKWARD: 'move backward by',
    TURTLE_TURN_TOOLTIP: 'Turns the turtle left or right by the specified number of degrees.',
    TURTLE_TURN_RIGHT: 'turn right by',
    TURTLE_TURN_LEFT: 'turn left by',
    TURTLE_WIDTH_TOOLTIP: 'Changes the width of the pen.',
    TURTLE_SET_WIDTH: 'set width to',
    TURTLE_COLOUR_TOOLTIP: 'Changes the colour of the pen.',
    TURTLE_SET_COLOUR: 'set colour to',
    TURTLE_PEN_TOOLTIP: 'Lifts or lowers the pen, to stop or start drawing.',
    TURTLE_PEN_UP: 'pen up',
    TURTLE_PEN_DOWN: 'pen down',
    TURTLE_VISIBILITY_TOOLTIP: 'Makes the turtle (circle and arrow) visible or invisible.',
    TURTLE_HIDE_TURTLE: 'hide turtle',
    TURTLE_SHOW_TURTLE: 'show turtle',
    TURTLE_PRINT_TOOLTIP: 'Draws text in the turtle\'s direction at its location.',
    TURTLE_PRINT: 'print',
    TURTLE_FONT_TOOLTIP: 'Sets the font used by the print block.',
    TURTLE_FONT: 'font',
    TURTLE_FONT_SIZE: 'font size',
    TURTLE_FONT_NORMAL: 'normal',
    TURTLE_FONT_BOLD: 'bold',
    TURTLE_FONT_ITALIC: 'italic',

    // Gallery and submission
    TURTLE_SUBMIT_DISABLED: 'Run your program until it stops. Then you may submit your drawing to the gallery.',
    TURTLE_GALLERY_TOOLTIP: 'Open the gallery of drawings.',
    TURTLE_GALLERY_MSG: 'See Gallery',
    TURTLE_SUBMIT_TOOLTIP: 'Submit your drawing to the gallery.',
    TURTLE_SUBMIT_MSG: 'Submit to Gallery',

    // Help text for each level
    TURTLE_HELP_USE_LOOP: 'Your solution works, but you can do better.',
    TURTLE_HELP_USE_LOOP3: 'Draw the shape with just three blocks.',
    TURTLE_HELP_USE_LOOP4: 'Draw the star with just four blocks.',
    TURTLE_HELP_TEXT1: 'Create a program that draws a square.',
    TURTLE_HELP_TEXT2: 'Change your program to draw a pentagon instead of a square.',
    TURTLE_HELP_TEXT3A: 'There\'s a new block that allows you to change the colour:',
    TURTLE_HELP_TEXT3B: 'Draw a yellow star.',
    TURTLE_HELP_TEXT4A: 'There\'s a new block that allows you to lift your pen off the paper when you move:',
    TURTLE_HELP_TEXT4B: 'Draw a small yellow star, then draw a line above it.',
    TURTLE_HELP_TEXT5: 'Instead of one star, can you draw four stars arranged in a square?',
    TURTLE_HELP_TEXT6: 'Draw three yellow stars, and one white line.',
    TURTLE_HELP_TEXT7: 'Draw the stars, then draw four white lines.',
    TURTLE_HELP_TEXT8: 'Drawing 360 white lines will look like the full moon.',
    TURTLE_HELP_TEXT9: 'Can you add a black circle so that the moon becomes a crescent?',
    TURTLE_HELP_TEXT10: 'Draw anything you want. You\'ve got a huge number of new blocks you can explore. Have fun!',
    TURTLE_HELP_TEXT10_REDDIT: 'Use the \'See Gallery\' button to see what other people have drawn. If you draw something interesting, use the \'Submit to Gallery\' button to publish it.',
    TURTLE_HELP_TOOLBOX: 'Choose a category to see the blocks.',

    // UI strings (from Games.*)
    TURTLE_RUN_PROGRAM: 'Run Program',
    TURTLE_RESET_PROGRAM: 'Reset',
    TURTLE_HELP: 'Help',
    TURTLE_CONGRATULATIONS: 'Congratulations!',
    TURTLE_NEXT_LEVEL: 'Are you ready for level %1?',
    TURTLE_LINES_OF_CODE1: 'You solved this level with 1 line of JavaScript:',
    TURTLE_LINES_OF_CODE2: 'You solved this level with %1 lines of JavaScript:',

    // Page UI
    TURTLE_TITLE: 'Turtle',
    TURTLE_LANGUAGE_LABEL: 'Language:',

    // Level display
    TURTLE_LEVEL: 'Level',
    TURTLE_LEVEL_COUNTER: 'Level %1 of %2',

    // Instructions
    TURTLE_SPEED_LABEL: 'Speed:',

    // Category names for Level 10 toolbox
    CATEGORY_TURTLE: 'Turtle',
    CATEGORY_COLOUR: 'Colour',
    CATEGORY_LOGIC: 'Logic',
    CATEGORY_LOOPS: 'Loops',
    CATEGORY_MATH: 'Math',
    CATEGORY_LISTS: 'Lists',
    CATEGORY_VARIABLES: 'Variables',
    CATEGORY_PROCEDURES: 'Functions',
  },

  fr: {
    // Block text and tooltips
    TURTLE_MOVE_TOOLTIP: 'Déplace la tortue en avant ou en arrière de la quantité indiquée.',
    TURTLE_MOVE_FORWARD: 'avancer de',
    TURTLE_MOVE_BACKWARD: 'reculer de',
    TURTLE_TURN_TOOLTIP: 'Faire tourner la tortue à gauche ou à droite du nombre de degrés indiqué.',
    TURTLE_TURN_RIGHT: 'tourner à droite de',
    TURTLE_TURN_LEFT: 'tourner à gauche de',
    TURTLE_WIDTH_TOOLTIP: 'Modifie l\'épaisseur de tracé du crayon.',
    TURTLE_SET_WIDTH: 'mettre l\'épaisseur à',
    TURTLE_COLOUR_TOOLTIP: 'Modifie la couleur du crayon.',
    TURTLE_SET_COLOUR: 'mettre la couleur à',
    TURTLE_PEN_TOOLTIP: 'Lève ou pose le crayon, pour arrêter ou commencer à dessiner.',
    TURTLE_PEN_UP: 'lever le crayon',
    TURTLE_PEN_DOWN: 'poser le crayon',
    TURTLE_VISIBILITY_TOOLTIP: 'Rend visible ou invisible la tortue (cercle et flèche).',
    TURTLE_HIDE_TURTLE: 'cacher la tortue',
    TURTLE_SHOW_TURTLE: 'afficher la tortue',
    TURTLE_PRINT_TOOLTIP: 'Dessine le texte dans la direction de la tortue à son emplacement.',
    TURTLE_PRINT: 'écrire',
    TURTLE_FONT_TOOLTIP: 'Définit la police utilisée par le bloc d\'écriture.',
    TURTLE_FONT: 'police',
    TURTLE_FONT_SIZE: 'taille de la police',
    TURTLE_FONT_NORMAL: 'normal',
    TURTLE_FONT_BOLD: 'gras',
    TURTLE_FONT_ITALIC: 'italique',

    // Gallery and submission
    TURTLE_SUBMIT_DISABLED: 'Lancez votre programme jusqu\'à ce qu\'il s\'arrête. Vous pourrez ensuite publier votre dessin dans la galerie.',
    TURTLE_GALLERY_TOOLTIP: 'Ouvrir la galerie des dessins.',
    TURTLE_GALLERY_MSG: 'Voir la galerie',
    TURTLE_SUBMIT_TOOLTIP: 'Publier votre dessin sur la galerie.',
    TURTLE_SUBMIT_MSG: 'Publier dans la galerie',

    // Help text for each level
    TURTLE_HELP_USE_LOOP: 'Votre solution fonctionne, mais vous pouvez faire mieux.',
    TURTLE_HELP_USE_LOOP3: 'Dessinez la forme avec seulement trois blocs.',
    TURTLE_HELP_USE_LOOP4: 'Dessinez l\'étoile avec seulement quatre blocs.',
    TURTLE_HELP_TEXT1: 'Créez un programme qui dessine un carré.',
    TURTLE_HELP_TEXT2: 'Modifiez votre programme pour dessiner un pentagone plutôt qu\'un carré.',
    TURTLE_HELP_TEXT3A: 'Voici un nouveau bloc qui vous permet de modifier la couleur :',
    TURTLE_HELP_TEXT3B: 'Dessinez une étoile jaune.',
    TURTLE_HELP_TEXT4A: 'Voici un nouveau bloc qui vous permet de lever votre crayon de la feuille quand vous vous déplacez :',
    TURTLE_HELP_TEXT4B: 'Dessinez une petite étoile jaune, puis une ligne par dessus.',
    TURTLE_HELP_TEXT5: 'Au lieu d\'une seule étoile, pouvez-vous dessiner quatre étoiles arrangées en carré ?',
    TURTLE_HELP_TEXT6: 'Dessinez trois étoiles jaunes et une ligne blanche.',
    TURTLE_HELP_TEXT7: 'Dessinez les étoiles puis quatre lignes blanches.',
    TURTLE_HELP_TEXT8: 'Dessinez 360 lignes blanches qui ressemblent à une pleine lune.',
    TURTLE_HELP_TEXT9: 'Pouvez-vous ajouter un cercle noir afin que la lune devienne un croissant ?',
    TURTLE_HELP_TEXT10: 'Dessinez ce que vous voulez. Vous avez un grand nombre de blocs à explorer. Amusez-vous !',
    TURTLE_HELP_TEXT10_REDDIT: 'Utilisez le bouton « Voir la galerie » pour voir ce que les autres personnes ont dessiné. Si vous dessinez quelque chose d\'intéressant, utilisez le bouton « Publier dans la galerie » pour le publier.',
    TURTLE_HELP_TOOLBOX: 'Choisir une catégorie pour voir les blocs.',

    // UI strings (from Games.*)
    TURTLE_RUN_PROGRAM: 'Exécuter le programme',
    TURTLE_RESET_PROGRAM: 'Réinitialiser',
    TURTLE_HELP: 'Aide',
    TURTLE_CONGRATULATIONS: 'Félicitations !',
    TURTLE_NEXT_LEVEL: 'Êtes-vous prêt pour le niveau %1 ?',
    TURTLE_LINES_OF_CODE1: 'Vous avez résolu ce niveau avec 1 ligne de JavaScript :',
    TURTLE_LINES_OF_CODE2: 'Vous avez résolu ce niveau avec %1 lignes de JavaScript :',

    // Page UI
    TURTLE_TITLE: 'Tortue',
    TURTLE_LANGUAGE_LABEL: 'Langue :',

    // Level display
    TURTLE_LEVEL: 'Niveau',
    TURTLE_LEVEL_COUNTER: 'Niveau %1 sur %2',

    // Instructions
    TURTLE_SPEED_LABEL: 'Vitesse :',

    // Category names for Level 10 toolbox
    CATEGORY_TURTLE: 'Tortue',
    CATEGORY_COLOUR: 'Couleur',
    CATEGORY_LOGIC: 'Logique',
    CATEGORY_LOOPS: 'Boucles',
    CATEGORY_MATH: 'Maths',
    CATEGORY_LISTS: 'Listes',
    CATEGORY_VARIABLES: 'Variables',
    CATEGORY_PROCEDURES: 'Fonctions',
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

  console.log(`Loaded turtle game messages for locale: ${locale}`);
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
