import React, { useEffect, useRef, useState } from 'react';
import { api } from './api';
export function CircleHub({ user, run, toast }: { user: any; run: any; toast: any }) {
  const [circles, setCircles] = useState<any[]>([]),
    [selected, setSelected] = useState(''),
    [detail, setDetail] = useState<any>(null),
    [people, setPeople] = useState<any[]>([]),
    [query, setQuery] = useState('Alex'),
    [body, setBody] = useState(''),
    [profile, setProfile] = useState<any>(null);
  const clientId = useRef<string | null>(null);
  const chosen = useRef('');
  const choose = (next: string) => {
    chosen.current = next;
    setSelected(next);
    setDetail(null);
  };
  const pullDetail = async (next: string) => {
    const value = await api('/circles/' + next);
    if (chosen.current === next) setDetail(value);
  };
  const load = async () => {
    setCircles(await api('/circles'));
    if (chosen.current) await pullDetail(chosen.current);
  };
  useEffect(() => {
    api('/circles')
      .then((rows: any[]) => {
        setCircles(rows);
        const first = rows.find((g) => g.status === 'active');
        if (first) choose(first.id);
      })
      .catch(() => {});
    api('/circles/profile')
      .then(setProfile)
      .catch(() => {});
  }, [user.id]);
  useEffect(() => {
    if (selected) pullDetail(selected).catch(() => setDetail(null));
    else setDetail(null);
    const timer = setInterval(() => {
      if (!document.hidden) void load().catch(() => {});
    }, 10000);
    return () => clearInterval(timer);
  }, [selected, user.id]);
  const act = (fn: () => Promise<any>) =>
    run(async () => {
      await fn();
      await load();
    });
  return (
    <section className="circle-hub panel">
      <div className="eyebrow">YOUR PEOPLE. YOUR PLANS.</div>
      <h2>Your René circle.</h2>
      <p>
        Private messages, group invites and plans. Only joined members can read or send messages.
        Nothing is emailed or sent outside this app.
      </p>
      <div className="circle-layout">
        <div className="circle-sidebar">
          <h3>Conversations</h3>
          {circles.map((c) => (
            <div className={'circle-choice ' + (selected === c.id ? 'selected' : '')} key={c.id}>
              {c.status === 'invited' ? (
                <>
                  <b>{c.title}</b>
                  <small>Private invitation</small>
                  <div className="button-row">
                    <button
                      className="primary"
                      onClick={() =>
                        void act(async () => {
                          await api('/circles/' + c.id + '/respond', 'POST', { accept: true });
                          choose(c.id);
                        })
                      }
                    >
                      Join
                    </button>
                    <button
                      className="text-link"
                      onClick={() =>
                        void act(() =>
                          api('/circles/' + c.id + '/respond', 'POST', { accept: false }),
                        )
                      }
                    >
                      Decline
                    </button>
                  </div>
                </>
              ) : (
                <button onClick={() => choose(c.id)}>
                  <b>
                    {c.direct ? '◌' : '✦'} {c.title}
                  </b>
                  <small>{c.members} joined · Private</small>
                </button>
              )}
            </div>
          ))}
          {!circles.length && <p className="muted">Your first conversation starts here.</p>}
          <details>
            <summary>Create a private group</summary>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = e.currentTarget,
                  d = new FormData(f);
                void act(async () => {
                  const c = await api('/circles', 'POST', { title: d.get('title') });
                  choose(c.id);
                  f.reset();
                });
              }}
            >
              <label>
                Group name
                <input name="title" required maxLength={100} placeholder="Friday music crew" />
              </label>
              <button className="primary">Create group</button>
            </form>
          </details>
          <details>
            <summary>Find people & manage invitations</summary>
            <form
              className="button-row"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () =>
                  setPeople(await api('/circles/directory?q=' + encodeURIComponent(query))),
                );
              }}
            >
              <input
                aria-label="Find a discoverable member"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Member’s display name"
              />
              <button className="outline">Find</button>
            </form>
            {people.map((p) => (
              <div className="directory-person" key={p.id}>
                <b>{p.name}</b>
                <div className="button-row">
                  <button
                    className="outline"
                    onClick={() =>
                      void act(async () => {
                        const c = await api('/circles/direct', 'POST', { userId: p.id });
                        choose(c.id);
                        toast(c.message);
                      })
                    }
                  >
                    Message privately
                  </button>
                  {detail?.group.owner_id === user.id && !detail.group.direct_key && (
                    <button
                      className="outline"
                      onClick={() =>
                        void act(async () =>
                          toast(
                            (
                              await api('/circles/' + selected + '/invite', 'POST', {
                                userId: p.id,
                              })
                            ).message,
                          ),
                        )
                      }
                    >
                      Invite to group
                    </button>
                  )}
                </div>
              </div>
            ))}
          </details>
          {profile && (
            <label className="check-row">
              <input
                type="checkbox"
                checked={profile.discoverable}
                onChange={(e) =>
                  void act(async () => {
                    await api('/circles/profile', 'PUT', {
                      displayName: profile.display_name,
                      discoverable: e.target.checked,
                    });
                    setProfile({ ...profile, discoverable: e.target.checked });
                  })
                }
              />
              Let members find my display name
            </label>
          )}
          <small>
            Alex and Sam are fictional sample members. No external notifications or bookings are
            made.
          </small>
        </div>
        <div className="circle-conversation">
          {detail ? (
            <>
              <div className="conversation-title">
                <h3>{detail.group.title}</h3>
                <p>
                  {detail.members
                    .map((m: any) => m.name + (m.status === 'invited' ? ' (invited)' : ''))
                    .join(' · ')}
                </p>
              </div>
              <div className="message-thread" aria-live="polite">
                {detail.messages.map((m: any) => (
                  <article
                    key={m.id}
                    className={'message-bubble ' + (m.author_id === user.id ? 'mine' : '')}
                  >
                    <b>{m.name}</b>
                    <p>{m.body}</p>
                    <small>
                      {new Date(m.created_at).toLocaleTimeString('en-GB', {
                        timeZone: 'Europe/London',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </small>
                  </article>
                ))}
                {!detail.messages.length && (
                  <p className="muted">
                    Say hello. Invited members can read messages after joining.
                  </p>
                )}
              </div>
              <form
                className="message-composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  void act(async () => {
                    clientId.current ??= crypto.randomUUID();
                    await api('/circles/' + selected + '/messages', 'POST', {
                      body,
                      clientId: clientId.current,
                    });
                    setBody('');
                    clientId.current = null;
                  });
                }}
              >
                <label className="visually-hidden" htmlFor="message-body">
                  Your message
                </label>
                <textarea
                  id="message-body"
                  maxLength={2000}
                  value={body}
                  onChange={(e) => {
                    setBody(e.target.value);
                    clientId.current = null;
                  }}
                  placeholder="Make a plan, share a thought…"
                  required
                />
                <button className="primary" disabled={!body.trim()}>
                  Send
                </button>
              </form>
              <div className="plans-list">
                <h3>Make a night of it.</h3>
                {detail.plans.map((p: any) => (
                  <div className="circle-plan" key={p.id}>
                    <b>{p.title}</b>
                    <p>
                      {new Date(p.starts_at).toLocaleString('en-GB', {
                        timeZone: 'Europe/London',
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                    <small>{p.notes}</small>
                    <div className="chips">
                      {['yes', 'maybe', 'no'].map((response) => (
                        <button
                          key={response}
                          className={
                            p.rsvps.find((r: any) => r.user_id === user.id)?.response === response
                              ? 'selected'
                              : ''
                          }
                          onClick={() =>
                            void act(() =>
                              api('/circles/' + selected + '/plans/' + p.id + '/rsvp', 'PUT', {
                                response,
                              }),
                            )
                          }
                        >
                          {response === 'yes'
                            ? 'I’m in'
                            : response === 'maybe'
                              ? 'Maybe'
                              : 'Can’t make it'}{' '}
                          · {p.rsvps.filter((r: any) => r.response === response).length}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <details>
                  <summary>Add a plan</summary>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = e.currentTarget,
                        d = new FormData(f);
                      void act(async () => {
                        await api('/circles/' + selected + '/plans', 'POST', {
                          title: d.get('title'),
                          date: new Date(String(d.get('date'))).toISOString(),
                          notes: d.get('notes'),
                        });
                        f.reset();
                      });
                    }}
                  >
                    <label>
                      What’s the plan?
                      <input name="title" required maxLength={100} />
                    </label>
                    <label>
                      Date & time · your local time
                      <input name="date" type="datetime-local" required />
                    </label>
                    <label>
                      A note for everyone
                      <textarea name="notes" maxLength={500} />
                    </label>
                    <button className="primary">Add plan</button>
                  </form>
                </details>
              </div>
            </>
          ) : (
            <div className="empty">
              <h3>Good nights start with good people.</h3>
              <p>Choose a conversation, accept an invitation or create your group.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
