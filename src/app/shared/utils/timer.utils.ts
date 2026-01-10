import { BehaviorSubject, Subscription, timer } from 'rxjs';
import { takeWhile, map } from 'rxjs/operators';

export class CountdownTimer {
    private _timeLeft$ = new BehaviorSubject<number>(0);
    private timerSubscription: Subscription | null = null;

    get timeLeft$() {
        return this._timeLeft$.asObservable();
    }

    start(seconds: number) {
        this.stop();
        this._timeLeft$.next(seconds);

        this.timerSubscription = timer(0, 1000).pipe(
            map(i => seconds - i),
            takeWhile(val => val >= 0)
        ).subscribe(val => this._timeLeft$.next(val));
    }

    stop() {
        if (this.timerSubscription) {
            this.timerSubscription.unsubscribe();
            this.timerSubscription = null;
        }
    }

    reset() {
        this.stop();
        this._timeLeft$.next(0);
    }
}
