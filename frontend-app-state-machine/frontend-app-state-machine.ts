import * as Rx from "rx-lite";
import * as state from "./frontend-app-state";
import {tap, transform, Transformer} from "../utils/obj";
import {Interactions} from "../cycle-rx-utils/interactions";
import {LocalSettings} from "../local-storage/local-settings-model";
import {FrontendAppState, CurrentPage} from "./frontend-app-state";
import {SummaryStatsResponse} from "../api/api-models";
import {ClozeIdentifier, Note} from "../study-model/note-model";
import {ClientSession} from "../sessions/session-model";
import {ScheduledStudy} from "../local-storage/local-study-storage";
import {Resource} from "../study-model/note-model";
import {Scheduler} from "../study-model/scheduler";
import {ScheduleUpdate} from "../api/api-models";
import {ScheduledClozeIdentifier} from "../api/api-models";

var transformState:Transformer<FrontendAppState> = transform;
var transformSettings:Transformer<LocalSettings> = transform;

interface Accumulator {
  (last:FrontendAppState):FrontendAppState;
}

interface UnboundAccumulator<T> {
  (v:T, last:FrontendAppState):FrontendAppState;
}

export const EASY_FACTOR = 4.0;
export const FINE_FACTOR = 2.0;
export const HARD_FACTOR = 0.3;
export const SKIP_FACTOR = 0.0;

export class FrontendAppStateMachine {
  private scheduler = new Scheduler();
  localSettingsSinkSubject = this.interactions.interaction<LocalSettings>().subject;
  private accumulatorSubject = this.interactions.interaction<Accumulator>().subject;
  localSetting$ = this.localSettingsSinkSubject.asObservable().debounce(1000);
  allAppState$ = this.accumulatorSubject.scan<FrontendAppState>(
    (lastState:FrontendAppState, acc:Accumulator) => {
      return acc(lastState);
    }, this.initialState).startWith(this.initialState)
    .distinctUntilChanged((v:any) => v, (a, b) => a === b)
    .shareReplay(1);

  appState$ = this.allAppState$.debounce(0);

  pressKey = tap(this.interactions.interaction<string>())(interaction => {
    this.accumulator<string>(interaction.subject, (k, state) => {
      switch (k) {
        case String.fromCharCode(13):
          this.beginStudy.subject.onNext(null)
          break;
        case "f":
          this.showHideAnswer.subject.onNext(!state.isAnswering);
          break;
        case "j":
          this.selectNewStudyIdx.subject.onNext(state.curStudyIdx + 1);
          break;
        case "k":
          this.selectNewStudyIdx.subject.onNext(state.curStudyIdx - 1);
          break;
        case "r":
          if (state.currentPage === CurrentPage.SUMMARY) {
            this.requestSync.subject.onNext(null);
          } else {
            this.visitSummary.subject.onNext(null);
          }
          break;
        case "a":
          this.answerCard.listener(0.3);
          break;
        case "s":
          this.answerCard.listener(2.0);
          break;
        case "d":
          this.answerCard.listener(4.0);
          break;
        case "v":
          this.answerCard.listener(0.0);
          break;
      }

      return state;
    })
  });

  visitSummary = tap(this.interactions.interaction<void>())(interaction => {
    this.accumulator<any>(interaction.subject, (_, last) => {
      if (last.clientSession.isLoggedIn()) {
        // Local only sync.
        this.requestSync.subject.onNext(true);

        if (last.currentPage !== CurrentPage.SUMMARY) {
          return transformState(last)(next => next.currentPage = CurrentPage.SUMMARY)
        }
      }
      return last;
    });
  });

  beginStudy = tap(this.interactions.interaction<any>())(interaction => {
    this.accumulator<any>(interaction.subject, (_, last) => {
      if (last.scheduledStudy.scheduledClozes.length > 0
        && last.currentPage !== state.CurrentPage.STUDYING) {

        window.scrollTo(0, 0);
        return transformState(last)(next => {
          next.currentPage = CurrentPage.STUDYING;
          next.curStudyIdx = 0;
          next.isAnswering = false;
        })
      }
      return last;
    });
  });

  selectNewStudyIdx = tap(this.interactions.interaction<number>())(interaction => {
    this.accumulator<number>(interaction.subject, (idx, last) => {
      if (last.currentPage !== state.CurrentPage.STUDYING) return last;
      if (last.scheduledStudy.scheduledClozes.length > idx && idx >= 0) {
        return transformState(last)(next => {
          next.curStudyIdx = idx;
          next.isAnswering = false;
        });
      }
      return last;
    });
  });

  loadLocalSettings = tap(this.subject<LocalSettings>())(subject => {
    this.accumulator<LocalSettings>(subject, (newSettings, last) => {
      return transformState(last)(next => next.localSettings = newSettings);
    })
  });

  changeQueueMax = tap(this.interactions.interaction<number>())(interaction => {
    this.sinkSettingsAccumulator<number>(interaction.subject, (v, last) => {
      return transformSettings(last)(next => next.maxQueueSize = v);
    });
  });

  changeFilter = tap(this.interactions.interaction<[string, number]>())(interaction => {
    this.sinkSettingsAccumulator<[string, number]>(interaction.subject, ([text, idx], last) => {
      return transformSettings(last)(s => {
        s.studyFilters = s.studyFilters.slice(0);
        if (!text) {
          s.studyFilters.splice(idx, 1);
        } else {
          s.studyFilters[idx] = text;
        }
      });
    });
  });

  addFilter = tap(this.interactions.interaction<string>())(interaction => {
    this.sinkSettingsAccumulator<string>(interaction.subject, (text, last) => {
      return transformSettings(last)(s => {
        s.studyFilters = s.studyFilters.concat([text]);
      });
    });
  });

  showHideAnswer = tap(this.interactions.interaction<boolean>())(interaction => {
    this.accumulator<boolean>(interaction.subject, (doShow, last) => {
      if (last.currentPage === state.CurrentPage.STUDYING) {
        return transformState(last)(next => {
          next.isAnswering = doShow;
        });
      }
      return last;
    });
  });

  answerCard = tap(this.interactions.interaction<number>())(interaction => {
    this.accumulator<number>(interaction.subject, (factor, last) => {
      if (last.currentPage != state.CurrentPage.STUDYING || !last.isAnswering) {
        return last;
      }

      return transformState(last)(next => {
        var study = last.scheduledStudy;
        next.scheduledStudy = transform<ScheduledStudy>(last.scheduledStudy)(nextStudy => {
          nextStudy.scheduledClozes = study.scheduledClozes.slice(0);
          nextStudy.scheduledClozes.splice(last.curStudyIdx, 1);
        });

        if (next.curStudyIdx >= next.scheduledStudy.scheduledClozes.length) {
          next.curStudyIdx = next.scheduledStudy.scheduledClozes.length - 1;
        }

        next.numStudiedCurSession += 1;

        var answered = study.scheduledClozes[last.curStudyIdx];
        var note = study.notes[answered.clozeIdentifier.noteId];
        var cloze = note.findCloze(answered.clozeIdentifier);
        var nextSchedule = this.scheduler.nextByFactor(cloze.schedule, factor,
          Math.floor(Date.now() / 60000));

        var scheduleUpdate = new ScheduleUpdate();
        scheduleUpdate.scheduledIdentifier = answered;
        scheduleUpdate.schedule = nextSchedule;
        this.requestStoreScheduleUpdate.onNext(scheduleUpdate);

        next.isAnswering = false;

        if (next.curStudyIdx === -1) {
          this.visitSummary.subject.onNext(null);
        }
      });
    });
  });

  requestStoreScheduleUpdate = this.subject<ScheduleUpdate>();

  requestSummaryStats = tap(this.subject<void>())(subject => {
    this.accumulator<any>(subject, (_, last) => {
      if (last.summaryStatsLoaded) {
        return transformState(last)(next => next.summaryStatsLoaded = false);
      }
      return last;
    })
  });

  loadSummaryStats = tap(this.subject<Rx.Observable<SummaryStatsResponse>>())(subject => {
    var restartSwitch:()=>Rx.Observable<SummaryStatsResponse> = () => subject.switch()
      .catch(restartSwitch);
    this.accumulator<SummaryStatsResponse>(restartSwitch(), (stats, last) => {
      return transformState(last)(next => {
        next.summaryStats = stats;
        next.summaryStatsLoaded = true;
      });
    })
  });

  requestSync = this.interactions.interaction<boolean>();

  requestUpdateNote = this.subject<[string, number]>();

  finishSync = tap(this.subject<boolean>())(subject => {
    subject.subscribe(() => this.requestSummaryStats.onNext(null));
  })

  loadStudy = tap(this.subject<ScheduledStudy>())(subject => {
    this.accumulator<ScheduledStudy>(subject, (study, last) => {
      // Don't load in a schedule during study if it would be impossible to perform that study.
      // Visit the summary page and allow a new syncing of state.
      if (study.scheduledClozes.length == 0 && last.currentPage == CurrentPage.STUDYING) {
        this.visitSummary.subject.onNext(null);
        return last;
      }
      return transformState(last)(next => {
        next.scheduledStudy = study;
        next.curStudyIdx = 0;
        next.isAnswering = false;
      });
    })
  });

  requestLatestNote = this.subject<string>();

  loadClientSession = tap(this.subject<ClientSession>())(subject => {
    this.accumulator<ClientSession>(subject, (session, last) => {
      return transformState(last)(next => {
        next.clientSession = session;
      })
    });

    subject.withLatestFrom<FrontendAppState, [CurrentPage, ClientSession]>(this.allAppState$,
      (session, state) => {
        return [state.currentPage, session];
      }).subscribe(([page, session]) => {
      if (page === CurrentPage.LOGGED_OUT && session.isLoggedIn()) {
        this.visitSummary.subject.onNext(null);
      }
    })
  });

  loadImages = tap(this.subject<Rx.Observable<Resource>[]>())(subject => {
    var politeResource$ = subject.flatMap(resourceBatch => Rx.Observable.merge<Resource>(
      resourceBatch.map(o => o.catch(e => Rx.Observable.empty<Resource>()))));
    this.accumulator<Resource>(politeResource$, (resource, last) => {
      return transformState(last)(next => {
        next.images = last.images.concat([resource]);
      });
    })
  });

  // This ui experience is really tricky.
  //reloadScheduledCloze = tap(this.interactions.interaction<ScheduledClozeIdentifier>())(
  //  interaction => {
  //    this.accumulator(interaction.subject, (scheduledIdentifier, last) => {
  //      if (last.scheduledStudy.notes[scheduledIdentifier.clozeIdentifier.noteId] == null) {
  //        this.cascade(this.beginStudy.subject, null);
  //        return last;
  //      }
  //
  //      return transformState(last)(next => {
  //        next.scheduledStudy = transform<ScheduledStudy>(last.scheduledStudy)(study => {
  //          study.scheduledClozes = study.scheduledClozes.slice(0);
  //          study.scheduledClozes.push(scheduledIdentifier);
  //        })
  //      });
  //    });
  //  });

  requestImages = tap(this.interactions.interaction<string[]>())(interaction => {
    this.accumulator<string[]>(interaction.subject, (_, last) => {
      return transformState(last)(next => {
        next.images = [];
      });
    })
  });

  constructor(private interactions:Interactions,
              private initialState = new FrontendAppState()) {
  }

  private accumulator<T>(source:Rx.Observable<T>, acc:UnboundAccumulator<T>) {
    return source.map(v => (last:FrontendAppState) => {
      return acc(v, last);
    })
      .subscribe((f:(last:FrontendAppState)=>FrontendAppState) => {
        Rx.Scheduler.currentThread.schedule(null, () => {
          this.accumulatorSubject.onNext(f);
          return null;
        });
      });
  }

  private sinkSettingsAccumulator<T>(source:Rx.Observable<T>,
                                     acc:(v:T, settings:LocalSettings)=>LocalSettings) {
    this.accumulator<T>(source, (v, appState) => {
      return transformState(appState)(next => {
        next.localSettings = acc(v, next.localSettings);
        return next;
      })
    });
    source.withLatestFrom(this.allAppState$, (_, appState) => appState)
      .subscribe((appState) => this.localSettingsSinkSubject.onNext(appState.localSettings));
  }

  private subject<T>() {
    return this.interactions.interaction<T>().subject;
  }

  complete() {
    this.interactions.dispose();
  }
}