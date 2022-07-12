import { Component, HostListener, OnInit } from '@angular/core';

// Length of the word
const WORD_LENGTH = 5;

// Number of tries
const NUM_TRIES = 6;

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
export class TermoComponent implements OnInit {
  // Stores all tries
  // One try is one row in the UI
  readonly tries: Try[] = [];

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

  ngOnInit(): void {
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    this.handleClickKey(event.key);
  }

  private handleClickKey(key: string) {
    // Need to check if key is a letter or not
  }
}
