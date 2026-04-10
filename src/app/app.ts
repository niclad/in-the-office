import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { DatePipe, KeyValuePipe } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

export interface Place {
  name: string;
  color: string;
}

interface DateGrid {
  [person: string]: {
    [day: number | string]: Place | null;
  };
}

interface State {
  dateGrid: DateGrid;
  places: Place[];
}

@Component({
  selector: 'app-root',
  imports: [
    MatButtonToggleModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    FormsModule,
    MatChipsModule,
    MatSlideToggleModule,
    DatePipe,
    KeyValuePipe,
    MatTooltipModule,
    MatDividerModule,
  ],
  // imports: [RouterOutlet, MatButtonToggleModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('ito');
  // ROYGBIV — light shades for contrast with dark text
  readonly placeColorPalette = [
    '#EF9A9A',
    '#FFCC80',
    '#FFF176',
    '#A5D6A7',
    '#90CAF9',
    '#9FA8DA',
    '#CE93D8',
  ];
  names: string[] = [];
  namesInput: string = '';
  places: Place[] = [];
  placesInput: string = '';
  selectedPlace: string = '';
  calendarId: string = 'fAkeBasE64=';
  loadId: string = '';
  showWeekend: boolean = false;
  readonly selected = new Set<string>();
  private days: Date[] = [];
  public dateGrid: DateGrid = {};
  weekBias: number = 0;

  constructor() {
    this.init();
  }

  private init(bias: number = 0) {
    this.days = this.getWeek(bias);
    this.names.forEach((name) => {
      if (!this.dateGrid[name]) {
        this.dateGrid[name] = {};
      }
      this.days.forEach((day) => {
        if (this.showWeekend || (day.getDay() !== 0 && day.getDay() !== 6)) {
          this.dateGrid[name][day.getTime()] = null;
        }
      });
    });

    this.generateId();
  }

  isSelected(name: string, day: number | string): boolean {
    return this.selected.has(`${name}|${day}`);
  }

  get visibleDays(): Date[] {
    const days = this.days;
    // day is not Sunday (0) or Saturday (6)
    return this.showWeekend ? days : days.filter((day) => day.getDay() !== 0 && day.getDay() !== 6);
  }

  get gridColumns(): string {
    return `120px repeat(${this.visibleDays.length}, 1fr)`;
  }

  public submitName(): void {
    const name = this.namesInput.trim();
    if (name && !this.names.includes(name)) {
      this.names.push(name);
      this.dateGrid[name] = {};
      this.days.forEach((day) => {
        if (this.showWeekend || (day.getDay() !== 0 && day.getDay() !== 6)) {
          this.dateGrid[name][day.getTime()] = null;
        }
      });
      this.generateId();
    }
    this.namesInput = '';
  }

  public submitPlace(): void {
    const placeName = this.placesInput.trim();
    if (placeName && !this.places.some((p) => p.name === placeName)) {
      this.places.push({
        name: placeName,
        color: this.placeColorPalette[this.places.length % this.placeColorPalette.length],
      });
      this.generateId();
    }
    this.placesInput = '';
  }

  private getListItems(s: string): string[] {
    const parts = s.split(/[\n,]+/);
    if (parts.length <= 1) return [];
    return parts
      .slice(0, -1)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  public copyCalendarId(): void {
    if (!this.calendarId) return;
    navigator.clipboard
      .writeText(this.calendarId)
      .then(() => {
        console.debug('Calendar ID copied to clipboard');
      })
      .catch((err) => {
        console.error('Failed to copy calendar ID: ', err);
      });
  }

  public loadCalendarIdFromClipboard(): void {
    navigator.clipboard
      .readText()
      .then((text) => {
        this.loadId = text;
        return this.loadCalendarId();
      })
      .catch((err) => {
        console.error('Failed to load calendar from clipboard:', err);
      });
  }

  public loadCalendarId(): Promise<void> {
    if (!this.loadId) return Promise.resolve();

    return this.decompress(this.loadId)
      .then((decompressed) => {
        this.parseId(decompressed);
        this.generateId();
      })
      .catch((err) => {
        console.error('Error decompressing calendar ID:', err);
      });
  }

  public toggleDay(name: string, day: number | string): void {
    const key = `${name}|${day}`;
    if (this.selected.has(key)) {
      this.selected.delete(key);
    } else {
      this.selected.add(key);
    }
  }

  public toggleAllVisibleDays(name: string): void {
    let preselectCount = 0;
    this.visibleDays.forEach((day) => {
      if (!this.isSelected(name, day.getTime())) {
        this.selected.add(`${name}|${day.getTime()}`);
      } else {
        preselectCount++;
      }
    });

    // If everything was already selected, deselect all
    if (preselectCount === this.visibleDays.length) {
      this.visibleDays.forEach((day) => {
        this.selected.delete(`${name}|${day.getTime()}`);
      });
    }
  }

  /**
   * Toggle a day for all people in the calendar
   * @param day The day of the week to toggle
   */
  public toggleAllPeople(day: number | string): void {
    let preselectCount = 0;
    this.names.forEach((name) => {
      if (!this.isSelected(name, day)) {
        this.selected.add(`${name}|${day}`);
      } else {
        preselectCount++;
      }
    });

    // If everything was already selected, deselect all
    if (preselectCount === this.names.length) {
      this.names.forEach((name) => {
        this.selected.delete(`${name}|${day}`);
      });
    }
  }

  private getWeek(bias: number = 0): Date[] {
    const today = new Date();
    const day = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const diffToMonday = (day + 6) % 7; // number of days to subtract to get Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() - diffToMonday + bias * 7);
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      week.push(d);
    }
    return week;
  }

  assignPlace(place: Place): void {
    console.debug('Assigning place: ', place);
    const keysToRemove = [...this.selected];
    keysToRemove.forEach((key) => {
      const [name, dayString] = key.split('|');
      const day = Number(dayString);
      this.selected.delete(key);
      this.dateGrid[name][day] = place;
    });
    this.generateId();
  }

  async compress(input: string): Promise<string> {
    const stream = new Blob([input]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const buf = await new Response(stream).arrayBuffer();
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  }

  async decompress(b64: string): Promise<string> {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(stream).text();
  }

  private generateId(): void {
    // Filter days for people that have no assigned place so that only assigned days are included in the ID
    const filteredDateGrid: DateGrid = {};
    Object.keys(this.dateGrid).forEach((name) => {
      filteredDateGrid[name] = {};
      Object.keys(this.dateGrid[name]).forEach((day) => {
        if (this.dateGrid[name][day]) {
          filteredDateGrid[name][day] = this.dateGrid[name][day];
        }
      });
    });

    const state: State = {
      dateGrid: filteredDateGrid,
      places: this.places,
    };
    const gridJson = JSON.stringify(state);
    // get rid of whitespace to make the ID shorter
    const truncJson = gridJson.replace(/\s+/g, '');

    this.compress(truncJson)
      .then((compressedB64) => {
        this.calendarId = compressedB64;
      })
      .catch((err) => {
        console.error('Error compressing calendar state:', err);
      });
  }

  private parseId(id: string): void {
    const rawJson = atob(id);
    const state: State = JSON.parse(rawJson);

    // Rebuild the dateGrid to include all days for each person, filling in null for unassigned days
    const filteredDateGrid: DateGrid = state.dateGrid;
    Object.keys(filteredDateGrid).forEach((name) => {
      Object.keys(
        this.getWeek().reduce(
          (acc, day) => {
            acc[day.getTime()] = null;
            return acc;
          },
          {} as { [key: number]: null },
        ),
      ).forEach((day) => {
        if (!(day in filteredDateGrid[name])) {
          filteredDateGrid[name][day] = null;
        }
      });
    });

    this.dateGrid = filteredDateGrid;
    this.places = state.places;

    // set the names
    this.names = Object.keys(this.dateGrid);
  }

  removeName(name: string): void {
    this.names = this.names.filter((n) => n !== name);
    delete this.dateGrid[name];
    this.generateId();
  }

  removePlace(place: Place): void {
    this.places = this.places.filter((p) => p.name !== place.name);
    Object.keys(this.dateGrid).forEach((name) => {
      Object.keys(this.dateGrid[name]).forEach((day) => {
        if (this.dateGrid[name][day]?.name === place.name) {
          this.dateGrid[name][day] = null;
        }
      });
    });
    this.generateId();
  }

  prevWeek(): void {
    this.init(--this.weekBias);
  }

  nextWeek(): void {
    this.init(++this.weekBias);
  }

  currentWeek(): void {
    this.init((this.weekBias = 0));
  }
}
