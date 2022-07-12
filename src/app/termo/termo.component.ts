import { Component, HostListener, OnInit } from '@angular/core';

// Length of the word
const WORD_LENGTH = 5;

// Number of tries
const NUM_TRIES = 6;

// Letter map
const LETTERS = (() => {
  // letter -> true. Easier to check
  const ret: {[key:string]:boolean} = {};
  for (let charCode = 97; charCode < 97+26; charCode++) {
    ret[String.fromCharCode(charCode)] = true;
  }
  return ret;
})();

// One try
interface Try {
  letters: Letter[];
}

// One letter in a try
interface Letter {
  text: string;
  state: LetterState;
}

enum LetterState {
  // Wrong
  WRONG,
  // Letter in word but position is wrong
  PARTIAL_MATCH,
  // Letter and position are all correct
  FULL_MATCH,
  // Before the current try is submitted
  PENDING
}


@Component({
  selector: 'app-termo',
  templateUrl: './termo.component.html',
  styleUrls: ['./termo.component.scss']
})
export class TermoComponent {
  // Stores all tries
  // One try is one row in the UI
  readonly tries: Try[] = [];

  // Message shown in the message panel
  infoMsg = '';

  // Tracks the current letter index
  private curLetterIndex = 0;

  // Tracks the number of submitted tries
  private numSubmittedTries = 0;

  constructor() {
    // Populate initial state of "tries"
    for (let i = 0; i < NUM_TRIES; i++) {
      const letters: Letter[] = [];
      for (let j = 0; j < WORD_LENGTH; j++) {
        letters.push({ text: '', state: LetterState.PENDING });
      }
      this.tries.push({ letters });
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    this.handleClickKey(event.key);
  }

  private handleClickKey(key: string) {
    // If key is a letter or not, update the text in the corresponding letter object
    if (LETTERS[key.toLowerCase()]) {
      // Only allow typing letters in the current try. Don't go over if the 
      // current try has not been submitted
      if (this.curLetterIndex < (this.numSubmittedTries + 1) * WORD_LENGTH) {
        this.setLetter(key);
        this.curLetterIndex++;
      }
    }
    // Handle delete
    else if (key === 'Backspace') {
      // Don't delete previous try
      if (this.curLetterIndex > this.numSubmittedTries * WORD_LENGTH) {
        this.curLetterIndex--;
        this.setLetter('');
      }
    } 
    // Submit the current try and check
    else if (key === 'Enter') {
      this.checkCurrentTry();
    }
  }

  private setLetter(letter: string) {
    const tryIndex = Math.floor(this.curLetterIndex / WORD_LENGTH);
    const letterIndex = this.curLetterIndex - tryIndex * WORD_LENGTH;
    this.tries[tryIndex].letters[letterIndex].text = letter;
  }

  private checkCurrentTry() {
    // Check if user has typed all letters
    const curTry = this.tries[this.numSubmittedTries];
    if (curTry.letters.some(letter => letter.text === '')) {
      console.log('not enough letters');
      return;
    }
  }
  
  isNextLetter(t: Try, l: Letter) {
    const tryIndex = this.tries.indexOf(t);

    if (tryIndex > this.numSubmittedTries)
      return false;

    const letterIndex = this.tries[tryIndex].letters.indexOf(l);
    const index = tryIndex * WORD_LENGTH + letterIndex
    return index == this.curLetterIndex;
  }
}
