import { Component, HostListener, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { WORDS } from '../words';

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
  @ViewChildren('tryContainer') tryContainers!: QueryList<ElementRef>;

  // Stores all tries
  // One try is one row in the UI
  readonly tries: Try[] = [];

  // This is to make LetterState enum accessible in html template
  readonly LetterState = LetterState;

  // Message shown in the message panel
  infoMsg = '';

  // Controls info message's fading-out animation
  fadeOutInfoMessage = false;

  // Tracks the current letter index
  private curLetterIndex = 0;

  // Tracks the number of submitted tries
  private numSubmittedTries = 0;

  // Store the target word
  private targetWord = '';

  // Won or not
  private won = false;

  private targetWordLetterCounts: {[letter: string]: number} = {};

  private isChecking: boolean = false;

  constructor() {
    // Populate initial state of "tries"
    for (let i = 0; i < NUM_TRIES; i++) {
      const letters: Letter[] = [];
      for (let j = 0; j < WORD_LENGTH; j++) {
        letters.push({ text: '', state: LetterState.PENDING });
      }
      this.tries.push({ letters });
    }

    // Get a target word from the word list
    const numWords = WORDS.length;
    while(true) {
      //Randomly select a word and check if its length is WORD_LENGTH
      const index = Math.floor(Math.random() * numWords);
      const word = WORDS[index];
      if (word.length === WORD_LENGTH) {
        this.targetWord = word.toLowerCase();
        break;
      }
    }
    // this.targetWord = 'chulé';
    console.log('Target word: ' + this.targetWord);

    // Stores the count for each letter from the target word
    // For example, if the target word is "happy", then this map will look like:
    // { 'h':1, 'a':1, 'p':2, 'y':1, }
    for (const letter of this.targetWord) {
      const count = this.targetWordLetterCounts[letter];
      if (count == null) {
        this.targetWordLetterCounts[letter] = 0;
      }
      this.targetWordLetterCounts[letter]++;
    }
    console.log(this.targetWordLetterCounts);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    this.handleClickKey(event.key);
  }

  private handleClickKey(key: string) {
    // Don't process key down when user has won the game
    if (this.won || this.isChecking) {
      return;
    }

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
      this.isChecking = true;
      this.checkCurrentTry();
    }
  }

  private setLetter(letter: string) {
    const tryIndex = Math.floor(this.curLetterIndex / WORD_LENGTH);
    const letterIndex = this.curLetterIndex - tryIndex * WORD_LENGTH;
    this.tries[tryIndex].letters[letterIndex].text = letter;
  }

  private async checkCurrentTry() {
    // Check if user has typed all letters
    const curTry = this.tries[this.numSubmittedTries];
    if (curTry.letters.some(letter => letter.text === '')) {
      this.isChecking = false;
      this.shakeCurrentRow();

      if (curTry.letters.every(letter => letter.text === '')) {
        return;
      }
      this.showInfoMessage('só palavras com 5 letras');
      return;
    }

    // Check if the current try is a word in the list
    const wordFromCurTry = 
        curTry.letters.map(letter => letter.text).join('').toLowerCase();
    if (!WORDS.includes(wordFromCurTry)) {
      this.showInfoMessage('essa palavra não é aceita');

      this.isChecking = false;
      this.shakeCurrentRow();
      return;
    }

    // Check if the current try matches the target word

    // Store the check results

    // Clone the counts map. Need to use it in every check with the initial 
    // values
    const targetWordLetterCounts = { ...this.targetWordLetterCounts };
    const states: LetterState[] = [];
    for (let i=0; i < WORD_LENGTH; i++) {
      const expected = this.targetWord[i];
      const curLetter = curTry.letters[i];
      const got = curLetter.text.toLowerCase();
      let state = LetterState.WRONG;
      if (expected === got && targetWordLetterCounts[got]>0) {
        targetWordLetterCounts[expected]--;
        state = LetterState.FULL_MATCH;
      } else if (
          this.targetWord.includes(got) &&
          targetWordLetterCounts[got] > 0 
      ) {
        targetWordLetterCounts[got]--;
        state = LetterState.PARTIAL_MATCH;
      }
      states.push(state);
    }
    console.log(states);

    // Animate
    const tryContainer = 
        this.tryContainers.get(this.numSubmittedTries)?.nativeElement as 
        HTMLElement;
    // Get the letter elements
    const letterEles = tryContainer.querySelectorAll('.letter-container');
    for (let i=0; i < letterEles.length; i++) {
      // "Fold" the letter, apply the result (and update the style), then unfold
      // it
      const curLetterEle = letterEles[i];
      curLetterEle.classList.add('fold');
      // Wait for the fold animation to finish
      await this.wait(180);
      // Update state. This will also update styles
      curTry.letters[i].state = states[i];
      // Unfold
      curLetterEle.classList.remove('fold');
      await this.wait(180);
    }

    this.isChecking = false;
    this.numSubmittedTries++;

    // Check if all letter in the current try are correct
    if (states.every(state => state === LetterState.FULL_MATCH)) {
      this.showInfoMessage('show!');
      this.won = true;
      // Bounce animation
      for (let i=0; i < letterEles.length; i++) {
        const curLetterEle = letterEles[i];
        curLetterEle.classList.add('bounce');
        await this.wait(160);
      }
      // TODO: show share dialog
      return;
    }

    // Running out of tries. Show correct answer
    if (this.numSubmittedTries === NUM_TRIES) {
      this.showInfoMessage(this.targetWord.toUpperCase(), false);
      //  TODO: show share
    }
  }

  private shakeCurrentRow() {
    const tryContainer =
      this.tryContainers.get(this.numSubmittedTries)
        ?.nativeElement as HTMLElement;
    tryContainer.classList.add('shake');
    setTimeout(() => {
      tryContainer.classList.remove('shake');
    }, 500);
  }

  private showInfoMessage(msg: string, hide = true) {
    this.infoMsg = msg;
    if (hide) {
      //Hide after 2s
      setTimeout(() => {
        this.fadeOutInfoMessage = true;
        // Reset when animation is done
        setTimeout(() => {
          this.infoMsg = '';
          this.fadeOutInfoMessage = false;
        }, 500);
      }, 2000);
    }
  }

  private async wait(ms: number) {
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, ms);
    })
  }
  
  isCurrentRow(t: Try, l: Letter) {
    const tryIndex = this.tries.indexOf(t);
    return this.numSubmittedTries >= tryIndex && !this.won;
  }

  isNextLetter(t: Try, l: Letter) {
    const tryIndex = this.tries.indexOf(t);

    if (tryIndex > this.numSubmittedTries)
      return false;

    const letterIndex = this.tries[tryIndex].letters.indexOf(l);
    const index = tryIndex * WORD_LENGTH + letterIndex
    return index === this.curLetterIndex && !this.won;
  }
}
