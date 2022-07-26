import { 
  Component, 
  HostListener, 
  ViewChildren, 
  QueryList, 
  ElementRef, 
  NgModule 
} from '@angular/core';
import { WORDS } from '../words';

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
  @ViewChildren('expandButton') expandButton!: ElementRef;

  // Length of the word
  WORD_LENGTH: number = 5;

  // Number of tries
  NUM_TRIES: number = 6;

  // Stores all tries
  // One try is one row in the UI
  tries: Try[] = [];

  // This is to make LetterState enum accessible in html template
  readonly LetterState = LetterState;

  // Keyboard rows
  readonly keyboardRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Enter', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Backspace']
  ];

  // Stores the state for the keyboard key indexed by keys
  curLetterStates:{[key: string]: LetterState} = {};

  // Message shown in the message panel
  infoMsg = '';

  // Controls info message's fading-out animation
  fadeOutInfoMessage = false;

  showConfigDialogContainer = false;
  showConfigDialog = false;

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

  private words: {[word: string]: string} = {};

  constructor() {
    console.log('starting');
    WORDS.map(w => this.words[this.removeAccent(w)] = w);
    console.log(WORDS.length, this.words);
    console.log('mapped');
    this.initializeGame();
    console.log('started');
  }

  initializeGame() {
    this.tries = [];
    this.targetWordLetterCounts = {};
    this.curLetterStates = {};
    this.curLetterIndex = 0;
    this.numSubmittedTries = 0;
    this.targetWord = '';
    this.won = false;
    this.targetWordLetterCounts = {};
    this.isChecking = false;

    // Get a target word from the word list
    const filteredWords: string[] = WORDS.filter(w => w.length === this.WORD_LENGTH);
    console.log(this.WORD_LENGTH);
    
    if (!filteredWords.length) {
      this.showInfoMessage('nenhuma palavra foi encontrada');
      return;
    }

    const numWords = filteredWords.length;

    //Randomly select a word and check if its length is WORD_LENGTH
    const index = Math.floor(Math.random() * numWords);
    const word = filteredWords[index];
    this.targetWord = word.toLowerCase();

    console.log('Target word: ' + this.targetWord);

    // Stores the count for each letter from the target word
    // For example, if the target word is "happy", then this map will look like:
    // { 'h':1, 'a':1, 'p':2, 'y':1, }
    for (let letter of this.targetWord) {
      letter = this.removeAccent(letter);
      const count = this.targetWordLetterCounts[letter];
      if (count == null) {
        this.targetWordLetterCounts[letter] = 0;
      }
      this.targetWordLetterCounts[letter]++;
    }
    console.log(this.targetWordLetterCounts);

    // Populate initial state of "tries"
    for (let i = 0; i < this.NUM_TRIES; i++) {
      const letters: Letter[] = [];
      for (let j = 0; j < this.WORD_LENGTH; j++) {
        letters.push({ text: '', state: LetterState.PENDING });
      }
      this.tries.push({ letters });
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    this.handleClickKey(event.key);
  }

  // Returns the classes for the given keyboard key based on its state
  getKeyClass(key: string): string {
    const state = this.curLetterStates[key.toLowerCase()];
    switch (state) {
      case LetterState.FULL_MATCH:
        return 'match key';

      case LetterState.PARTIAL_MATCH:
        return 'partial key';

      case LetterState.WRONG:
        return 'wrong key';

      default:
          return 'key';
    }
  }

  handleClickKey(key: string) {
    // Don't process key down when user has won the game
    if (this.won || this.isChecking) {
      return;
    }

    // If key is a letter or not, update the text in the corresponding letter 
    // object
    if (LETTERS[key.toLowerCase()]) {
      // Only allow typing letters in the current try. Don't go over if the 
      // current try has not been submitted

      const maxIndex = (this.numSubmittedTries + 1) * this.WORD_LENGTH;
      if (this.curLetterIndex < maxIndex) {
        this.setLetter(key);
        this.curLetterIndex++;

        while (this.curLetterIndex < maxIndex && this.getCurLetter()) {
          this.curLetterIndex++;
        }

        if (this.curLetterIndex > maxIndex) {
          this.curLetterIndex--;
        }
      }
    }
    // Handle delete
    else if (key === 'Backspace') {
      // Don't delete previous try
      const minIndex = this.numSubmittedTries * this.WORD_LENGTH;
      const maxIndex = (this.numSubmittedTries+1) * this.WORD_LENGTH;
      if (this.curLetterIndex >= minIndex) {
        if (this.curLetterIndex >= maxIndex || (!this.getCurLetter() && 
            this.curLetterIndex > minIndex))
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

  setCurrentLetterIndex(t: Try, l: Letter) {

    const tryIndex = this.tries.indexOf(t);
    
    if (this.numSubmittedTries != tryIndex || this.won)
      return;    

    const letterIndex = this.tries[tryIndex].letters.indexOf(l);
    const index = tryIndex * this.WORD_LENGTH + letterIndex

    this.curLetterIndex = index;

    // return index === this.curLetterIndex && !this.won;
  }

  handleClickRestart() {
    this.initializeGame();
    this.closeConfigDialog();
  }

  handleClickShare() {
    // 🟩🟨⬛
    // Copy results into clipboard
    let clipboardContent = '';
    for (let i=0; i < this.numSubmittedTries; i++) {
      for (let j=0; j < this.WORD_LENGTH; j++) {
        const letter = this.tries[i].letters[j];
        switch (letter.state) {
          case LetterState.FULL_MATCH:
            clipboardContent += '🟩';
            break;
          case LetterState.PARTIAL_MATCH:
            clipboardContent += '🟨';
            break;
          case LetterState.WRONG:
            clipboardContent += '⬛';
            break;
        }
      }
      clipboardContent += '\n';
    }

    console.log(clipboardContent);
    navigator.clipboard.writeText(clipboardContent);
    this.closeConfigDialog();
    this.showInfoMessage('copiado para o ctrl+V');
  }

  closeConfigDialog() {
    this.showConfigDialogContainer = false;
    this.showConfigDialog = false;
  }

  private setLetter(letter: string) {
    const tryIndex = Math.floor(this.curLetterIndex / this.WORD_LENGTH);
    const letterIndex = this.curLetterIndex - tryIndex * this.WORD_LENGTH;
    this.tries[tryIndex].letters[letterIndex].text = letter;
  }

  private getCurLetter() {
    const tryIndex = Math.floor(this.curLetterIndex / this.WORD_LENGTH);
    const letterIndex = this.curLetterIndex - tryIndex * this.WORD_LENGTH;
    return this.tries[tryIndex].letters[letterIndex].text;
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
      this.showInfoMessage(`só palavras com ${this.WORD_LENGTH} letras`);
      return;
    }

    // Check if the current try is a word in the list
    let wordFromCurTry: string | undefined = 
        curTry.letters.map(letter => letter.text).join('').toLowerCase();
    if (!this.words[wordFromCurTry])
    {
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
    const targetWord = this.removeAccent(this.targetWord);
    for (let i=0; i < this.WORD_LENGTH; i++) {
      const expected = targetWord[i];
      const got = wordFromCurTry[i];
      this.tries[this.numSubmittedTries].letters[i].text = this.words[wordFromCurTry][i];

      let state = LetterState.WRONG;
      if (expected === got) 
      {
        if (targetWordLetterCounts[got] <= 0) {
          for (let x=0; x < this.targetWordLetterCounts[got]; x++) {
            const index = wordFromCurTry.indexOf(got, x);
            if (states[index] === LetterState.PARTIAL_MATCH) {
              states[index] = LetterState.WRONG;
              targetWordLetterCounts[expected]++;
              break;
            }
          }
        }

        targetWordLetterCounts[expected]--;
        state = LetterState.FULL_MATCH;
      } else if (
          targetWord.includes(got) &&
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

    // Save to keyboard key states
    // Do this after the current try has been submitted and the animation above 
    // is done
    for (let i=0; i < this.WORD_LENGTH; i++) {
      const curLetter = curTry.letters[i];
      const got = curLetter.text.toLowerCase();
      const curStoredState = this.curLetterStates[got];
      const targetState = states[i];
      // This allows override state with better result
      // For example, if "A" was partial match in previous try, and becomes full 
      // match in the current try, we update the key state to the full match 
      // (because its enum value is larger)
      if (curStoredState == null || targetState > curStoredState) { 
        this.curLetterStates[got] = targetState;
      }
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
      this.showConfig(1500);
      return;
    }

    // Running out of tries. Show correct answer
    if (this.numSubmittedTries === this.NUM_TRIES) {
      this.showInfoMessage('palavra certa: ' + 
          this.targetWord.toLowerCase(), false);
      this.showConfig(1500);
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

  shakeExpand:boolean = false;
  handleExpandClick() {
    this.shakeExpand = true;
    setTimeout(() => {
      this.shakeExpand = false;
    }, 500);
  }

  showConfig(msToWait = 0) {
    setTimeout(() => {
      this.showConfigDialogContainer = true;
      // Wait a tick till dialog container is displayed
      setTimeout(() => {
        // Slide in the config dialog
        this.showConfigDialog = true;
      });
    }, msToWait);
  };
  
  isCurrentRow(t: Try, l: Letter) {
    const tryIndex = this.tries.indexOf(t);
    return this.numSubmittedTries >= tryIndex && !this.won;
  }

  isNextLetter(t: Try, l: Letter) {
    const tryIndex = this.tries.indexOf(t);

    if (tryIndex > this.numSubmittedTries)
      return false;

    const letterIndex = this.tries[tryIndex].letters.indexOf(l);
    const index = tryIndex * this.WORD_LENGTH + letterIndex
    return index === this.curLetterIndex && !this.won;
  }

  getWordLength(event: any) {
    this.WORD_LENGTH = +event.target.value > 0 ? +event.target.value : 0;
    
    console.log(this.WORD_LENGTH, event.target.value);
  }
  getNumberOfTries(event: any) {
    this.NUM_TRIES = +event.target.value > 0 ? +event.target.value : 0;

    console.log(this.WORD_LENGTH, event.target.value);
  }

  removeAccent(str: string) {
    return str
      .toUpperCase()
      .replace(/[ÀÁÂÃÄÅ]/g,"A")
      .replace(/[ÈÉÊË]/g,"E")
      .replace(/[ÌÍÎÏ]/g,"I")
      .replace(/[ÒÓÕÔÖ]/g,"O")
      .replace(/[ÙÚÛÜ]/g,"U")
      .replace(/[Ç]/g, "C")
      .toLowerCase();
  }
}
