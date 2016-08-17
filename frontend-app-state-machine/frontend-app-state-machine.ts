import * as Rx from "rx-lite";
import * as state from "./frontend-app-state";
import {tap, transform, Transformer, shallowCopy} from "../utils/obj";
import {Interactions} from "../cycle-rx-utils/interactions";
import {LocalSettings} from "../local-storage/local-settings-model";
import {FrontendAppState, CurrentPage} from "./frontend-app-state";
import {SummaryStatsResponse} from "../api/api-models";
import {ClozeIdentifier, Note, Term, Cloze} from "../study-model/note-model";
import {ClientSession} from "../sessions/session-model";
import {ScheduledStudy} from "../local-storage/local-study-storage";
import {Resource} from "../study-model/note-model";
import {Scheduler} from "../study-model/scheduler";
import {ScheduleUpdate} from "../api/api-models";
import {ScheduledClozeIdentifier} from "../api/api-models";
import {
  McdEditorAction, ReturnToSummary, SelectTextCell,
  OpenTerm, TermAction, FinishEditingTerm, DeleteTerm, EditTermHint, EditTermLanguage,
  EditTermVoiceUrl, EditTermDetails, EditTermClozes, EditTermFlipSpeak, CancelNote, CommitNote
} from "../mcd-editor/mcd-editor-actions";
import {
  McdEditorNoteState, McdEditorState,
  McdEditorTermState
} from "../mcd-editor/mcd-editor-state";
import {text} from "body-parser";
import {LocalMcdState} from "../local-storage/local-mcd-storage";

var transformState:Transformer<FrontendAppState> = transform;
var transformSettings:Transformer<LocalSettings> = transform;
var transformMcd:Transformer<McdEditorState> = transform;
var transformTerm:Transformer<McdEditorTermState> = transform;
var transformNote:Transformer<McdEditorNoteState> = transform;

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
          } else if (state.currentPage !== CurrentPage.MCDS) {
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

  focusApp = tap(this.interactions.interaction<void>())(interaction => {
    this.accumulator<void>(interaction.subject, (_, last) => {
      if (last.currentPage !== CurrentPage.MCDS) {
        this.visitSummary.subject.onNext(null);
      } else {
        this.visitMcds.subject.onNext(null);
      }

      return last;
    });
  });

  mcdEditorAction = this.interactions.interaction<McdEditorAction>();

  openTerm$ = this.mcdActionHandler<OpenTerm>(OpenTerm,
    (action:OpenTerm, last:McdEditorState) => {
      return transformMcd(last)((state:McdEditorState) => {
        state.termState = tap(new McdEditorTermState())((termState:McdEditorTermState) => {
          termState.editing = action.term;
          var segments = action.term.clozes.map(c => c.segment);

          for (var i = 0; i < segments.length; ++i) {
            if (segments[i].indexOf("speak:") != 0) {
              termState.clozes.push(segments[i]);
            } else {
              var split = segments[i].split(":");
              termState.language = split[1];
              termState.speakIt = true;
              termState.voiceUrl = split.slice(2).join(":");
            }
          }
        });

        state.editingTerm = true;
      });
    });

  finishEditing$ = this.mcdActionHandler<FinishEditingTerm>(FinishEditingTerm,
    (action:FinishEditingTerm, last:McdEditorState) => {
      return transformMcd(last)((next:McdEditorState) => {
        next.editingTerm = false;
        next.termState = new McdEditorTermState();
        this.requestWriteEdit.onNext(next.noteState.note);
      })
    });

  deleteTerm$ = this.mcdActionHandler<DeleteTerm>(DeleteTerm,
    (action:DeleteTerm, last:McdEditorState) => {
      return transformMcd(last)((next:McdEditorState) => {
        next.noteState = shallowCopy(next.noteState);
        var note = next.noteState.note = shallowCopy<Note>(next.noteState.note);
        var terms = note.terms.slice();

        for (var i = 0; i < terms.length; ++i) {
          if (terms[i].marker === last.termState.editing.marker &&
            terms[i].original === last.termState.editing.original) {
            var [s, e] = note.findTermRegion(terms[i], note.text);

            if (s != -1) {
              note.text = note.text.slice(0, s) + terms[i].original + note.text.slice(e);
            }

            terms.splice(i, 1);
            note.terms = terms;
            break;
          }
        }

        this.mcdEditorAction.subject.onNext(new FinishEditingTerm());
      })
    });

  editTermHint$ = this.mcdTermActionHandler<EditTermHint>(EditTermHint,
    (action:EditTermHint, newState:McdEditorTermState) => {
      newState.editing = shallowCopy(newState.editing);
      newState.editing.hint = action.value.replace(/\n/g, "");
    });

  editTermDetail$ = this.mcdTermActionHandler<EditTermDetails>(EditTermDetails,
    (action:EditTermDetails, newState:McdEditorTermState) => {
      newState.editing = shallowCopy(newState.editing);
      newState.editing.details = action.value.replace(/\r\n/g, "\n").replace(/\n\n/g, "\n");
    });

  editTermCloze$ = this.mcdTermActionHandler<EditTermClozes>(EditTermClozes,
    (action:EditTermClozes, newState:McdEditorTermState) => {
      var value = action.value.replace(/\s/g, "");

      if (value === "") {
        newState.clozes = []
      } else {
        newState.clozes = value.split(",");
      }

      newState.editing = shallowCopy(newState.editing);
      var termClozes = newState.editing.clozes = newState.editing.clozes.slice();

      var j = 0;
      var i = 0;
      var editingClozes = newState.clozes;

      while (i < editingClozes.length && j < termClozes.length) {
        if (termClozes[j].segment.indexOf("speak:") === 0) {
          j++;
          continue;
        }

        if (termClozes[j].segment != editingClozes[i]) {
          termClozes.splice(j, 1);
          continue;
        }

        j++;
        i++;
      }

      while (j < termClozes.length) {
        if (termClozes[j].segment.indexOf("speak:") === 0) {
          j++;
          continue;
        }

        termClozes.splice(j, 1);
      }

      for (; i < editingClozes.length; ++i) {
        var cloze = new Cloze();
        cloze.segment = editingClozes[i];
        termClozes.push(cloze);
      }
    });

  editTermLanguage$ = this.mcdTermActionHandler<EditTermLanguage>(EditTermLanguage,
    (action:EditTermLanguage, newState:McdEditorTermState) => {
      var language = action.value;

      newState.language = language;
      newState.editing = shallowCopy(newState.editing);
      var clozes = newState.editing.clozes = newState.editing.clozes.slice();

      for (var i = 0; i < clozes.length; ++i) {
        var cloze = clozes[i];
        var metaSplits = cloze.segment.split(":");
        if (metaSplits[0] === "speak" && metaSplits[1] != null) {
          if (language) {
            cloze = clozes[i] = shallowCopy(cloze);
            metaSplits[1] = language;
            cloze.segment = metaSplits.join(":");
          } else {
            cloze.segment = "speak:";
          }
        }
      }
    });

  flipSpeak$ = this.mcdTermActionHandler<EditTermFlipSpeak>(EditTermFlipSpeak,
    (action:EditTermFlipSpeak, newState:McdEditorTermState) => {
      var speakId = newState.speakIt = !newState.speakIt;
      var language = newState.language;
      var voiceUrl = newState.voiceUrl;

      newState.editing = shallowCopy(newState.editing);

      if (speakId) {
        var cloze = new Cloze();
        var newSegment = "speak:" + language;
        if (voiceUrl) newSegment += ":" + voiceUrl;
        cloze.segment = newSegment;

        var clozes = newState.editing.clozes = newState.editing.clozes.slice();
        clozes.push(cloze)
      } else {
        newState.editing.clozes =
          newState.editing.clozes.filter(c => c.segment.indexOf("speak:") != 0);
      }
    });

  cancelNote$ = this.mcdActionHandler<CancelNote>(CancelNote,
    (action:CancelNote, last:McdEditorState) => {
      var nextState = shallowCopy(last);
      nextState.noteState.edited = false;
      this.requestCancelEdit.onNext(last.noteState.note);
      return nextState;
    });

  commitNote$ = this.mcdActionHandler<CommitNote>(CommitNote,
    (action:CommitNote, last:McdEditorState) => {
      var nextState = shallowCopy(last);
      nextState.noteState.edited = false;
      this.requestCommitEdit.onNext(last.noteState.note);
      return nextState;
    });

  editTermVoiceUrl$ = this.mcdTermActionHandler<EditTermVoiceUrl>(EditTermVoiceUrl,
    (action:EditTermVoiceUrl, newState:McdEditorTermState) => {
      var voiceUrl = action.value.replace(/\s/g, "");
      newState.voiceUrl = voiceUrl;

      newState.editing = shallowCopy(newState.editing);
      var clozes = newState.editing.clozes = newState.editing.clozes.slice();

      for (var i = 0; i < clozes.length; ++i) {
        var cloze = clozes[i];
        var metaSplits = cloze.segment.split(":");
        if (metaSplits[0] === "speak" && metaSplits[1] != null) {
          cloze = clozes[i] = shallowCopy(cloze);
          metaSplits = metaSplits.slice(0, 2);
          if (voiceUrl) {
            metaSplits.push(voiceUrl);
          }
          cloze.segment = metaSplits.join(":");
        }
      }
    });

  selectTextCell$ = this.mcdActionHandler<SelectTextCell>(SelectTextCell,
    (action:SelectTextCell, last:McdEditorState) => {
      var region = last.noteState.regions[action.region];
      if (region == null) {
        return transformMcd(last)(state => {
          state.termState = transformTerm(state.termState)(term => {
            term.selectedRegion = -1;
            term.selectedRegionIdx = -1;
          })
        })
      }

      if (region[1]) {
        this.mcdEditorAction.listener(new OpenTerm(region[1]));
        return last;
      }

      if (last.termState.selectedRegion != action.region || last.termState.selectedRegionIdx > action.regionIdx) {
        return transformMcd(last)(state => {
          state.termState = transformTerm(state.termState)(term => {
            term.selectedRegion = action.region;
            term.selectedRegionIdx = action.regionIdx;
          });
        });
      }

      return transformMcd(last)((state:McdEditorState) => {
        var unannotatedIdx = 0;
        var annotatedIdx = 0;

        for (var i = 0; i < action.region; ++i) {
          var region = last.noteState.regions[i];
          unannotatedIdx += region[0];
          if (region[1] == null) {
            annotatedIdx += region[0];
          } else {
            var markerLength = region[1].marker.length;
            var originalLength = region[1].original.length;
            if (markerLength > originalLength) {
              annotatedIdx += markerLength
            } else {
              annotatedIdx += originalLength + 2 + markerLength;
            }
          }
        }

        var term = new Term();
        term.original =
          last.noteState.textWithoutAnnotations.slice(
            unannotatedIdx + last.termState.selectedRegionIdx,
            unannotatedIdx + action.regionIdx + 1);

        term.marker = state.noteState.note.findNextUniqueMarker(term.original);
        term.clozes.push(new Cloze());
        term.clozes[0].segment = term.original;

        state.noteState = transformNote(state.noteState)((noteState:McdEditorNoteState) => {
          var selectedRegionIdx = last.termState.selectedRegionIdx;

          noteState.note = transform<Note>(noteState.note)((note:Note) => {
            note.terms = note.terms.slice();
            note.terms.push(term);

            var left = annotatedIdx + selectedRegionIdx;
            var right = left + term.original.length;
            var precedingTerm = note.text.slice(0, left);
            var termReplacement = term.original + "[" + term.marker + "]";
            var afterTerm = note.text.slice(right);
            note.text = precedingTerm + termReplacement + afterTerm;
          });

          noteState.edited = true;
        });

        this.requestWriteEdit.onNext(state.noteState.note);
        this.mcdEditorAction.listener(new OpenTerm(term));
      });
    });

  mcdReturnToSummary$ = this.mcdEditorAction.subject
    .filter((e) => e instanceof ReturnToSummary).map(() => null);

  finishLoadingMcds = tap(this.interactions.interaction<LocalMcdState>())(interaction => {
    this.accumulator<LocalMcdState>(interaction.subject,
      (localMcds:LocalMcdState, last:FrontendAppState) => {
        return transformState(last)((state:FrontendAppState) => {
          if (last.mcdEditor.loaded && last.mcdEditor.editingTerm) {
            state.mcdEditor = transformMcd(last.mcdEditor)(s => s.queue = localMcds.queue);
            return;
          }

          if (localMcds.queue.length === 0) {
            state.mcdEditor = new McdEditorState();
            return;
          }

          state.mcdEditor = tap(new McdEditorState())((mcds:McdEditorState) => {
            mcds.queue = localMcds.queue;

            var note = mcds.queue[0];

            mcds.noteState = tap(new McdEditorNoteState())((noteState:McdEditorNoteState) => {
              noteState.note = note;

              var regions = [[note.text.length, null]] as [number, Term][];
              var textParts = [note.text] as string[];

              note.terms.forEach((t:Term) => {
                for (var i = 0; i < regions.length; ++i) {
                  if (regions[i][1] != null) continue;

                  var [s, e] = note.findTermRegion(t, textParts[i]);
                  if (s != -1) {
                    regions.splice(i, 1, [s, null], [t.original.length, t],
                      [regions[i][0] - e, null]);
                    textParts.splice(i, 1, textParts[i].slice(0, s), t.original,
                      textParts[i].slice(e));
                    break;
                  }
                }
              });

              noteState.regions = regions;
              noteState.textWithoutAnnotations = textParts.join("");
              noteState.edited = localMcds.edited;
            });

            mcds.loaded = true;
          });
        })
      });
  });

  requestWriteEdit = this.subject<Note>();
  writeEdit$ = this.requestWriteEdit.debounce(300);

  requestCancelEdit = this.subject<Note>();
  requestCommitEdit = this.subject<Note>();

  visitMcds = tap(this.interactions.interaction<void>())(interaction => {
    this.accumulator<any>(interaction.subject, (_, last) => {
      if (last.clientSession.isLoggedIn()) {
        // Local only sync.
        this.requestSync.subject.onNext(true);
        this.requestLoadMcds.subject.onNext(null);

        if (last.currentPage !== CurrentPage.MCDS) {
          return transformState(last)(next => next.currentPage = CurrentPage.MCDS)
        }
      }
      return last;
    });
  });

  loadPendingScheduleUpdates = tap(this.interactions.interaction<number>())(interaction => {
    this.accumulator<number>(interaction.subject, (count, last) => {
      return transformState(last)(next => next.pendingScheduleUpdates = count);
    });
  });

  loadPendingMcdUpdates = tap(this.interactions.interaction<number>())(interaction => {
    this.accumulator<number>(interaction.subject, (count, last) => {
      return transformState(last)(next => next.pendingMcdUpdates = count);
    });
  });

  visitSummary = tap(this.interactions.interaction<void>())(interaction => {
    this.accumulator<any>(Rx.Observable.merge(interaction.subject, this.mcdReturnToSummary$),
      (_, last) => {
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
      if (last.currentPage != CurrentPage.SUMMARY) return last;
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

  requestLoadMcds = this.interactions.interaction<void>();

  finishSync = tap(this.subject<boolean>())(subject => {
    subject.filter((b) => b).subscribe(() => this.requestSummaryStats.onNext(null));
  });

  loadStudy = tap(this.subject<ScheduledStudy>())(subject => {
    this.accumulator<ScheduledStudy>(subject, (study, last) => {
      // Don't load in a schedule during study if it would be impossible to perform that study.
      // Visit the summary page and allow a new syncing of state.
      if ((study.scheduledClozes.length == 0 && last.currentPage == CurrentPage.STUDYING)) {
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

  private mcdActionHandler<T extends McdEditorAction>(klass:{new(...args:any[]):T},
                                                      cb:(action:T,
                                                          last:McdEditorState)=>McdEditorState) {
    var action$ = this.mcdEditorAction.subject.filter(e => e instanceof klass).map<T>(e => <any>e);

    this.accumulator<T>(action$, (action:T, last:FrontendAppState) => {
      var next = cb(action, last.mcdEditor);
      if (next === last.mcdEditor) {
        return last;
      }

      return transformState(last)(nextState => nextState.mcdEditor = next);
    });

    return action$;
  }

  private mcdTermActionHandler<T extends TermAction>(klass:{new(...args:any[]):T},
                                                     cb:(action:T,
                                                         newState:McdEditorTermState)=>void) {
    this.mcdActionHandler(klass, (action, last) => {
      return transformMcd(last)((mcd:McdEditorState) => {
        mcd.termState = transformTerm(mcd.termState)(n => cb(action, n));

        var editedTerm = mcd.termState.editing;
        mcd.noteState = transformNote(mcd.noteState)((noteState:McdEditorNoteState) => {
          noteState.note = shallowCopy(noteState.note);
          var terms = noteState.note.terms.slice();

          for (var i = 0; i < terms.length; ++i) {
            var term = terms[i];
            if (term.marker === editedTerm.marker && term.original === editedTerm.original) {
              terms.splice(i, 1, editedTerm);
              noteState.note.terms = terms;
              this.requestWriteEdit.onNext(noteState.note);
              break;
            }
          }
        })
      })
    })
  }

  complete() {
    this.interactions.dispose();
  }
}