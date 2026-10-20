import { Alert } from 'react-native';

// React Native Web does not implement Alert. Preserve every action (including
// three-button dialogs) so organizer confirmations also work in the browser.
Alert.alert = (title, message, buttons, options) => {
  const dialog = document.createElement('dialog');
  dialog.setAttribute('aria-label', title);
  dialog.style.cssText = 'border:1px solid #bdcbb9;border-radius:16px;padding:28px;max-width:440px;width:calc(100% - 40px);background:#fbfcf7;color:#142d21;font-family:Arial,sans-serif;box-shadow:0 20px 80px #0005';
  const heading = document.createElement('h2'); heading.textContent = title; heading.style.cssText = 'font-size:21px;margin:0 0 14px';
  const body = document.createElement('p'); body.textContent = message ?? ''; body.style.cssText = 'font-size:15px;line-height:1.6;white-space:pre-wrap';
  const actions = document.createElement('div'); actions.style.cssText = 'display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;margin-top:24px';
  dialog.append(heading, body, actions);
  for (const action of buttons?.length ? buttons : [{ text: 'OK' }]) {
    const button = document.createElement('button'); button.textContent = action.text ?? 'OK';
    button.style.cssText = `border:0;border-radius:8px;padding:12px 18px;cursor:pointer;font-weight:bold;background:${action.style === 'destructive' ? '#a42929' : action.style === 'cancel' ? '#e5eadd' : '#205a3c'};color:${action.style === 'cancel' ? '#193323' : '#fff'}`;
    button.onclick = () => { dialog.close(); dialog.remove(); action.onPress?.(); };
    actions.append(button);
  }
  dialog.addEventListener('cancel', event => {
    if (options?.cancelable === false) { event.preventDefault(); return; }
    const cancel = buttons?.find(button => button.style === 'cancel');
    cancel?.onPress?.(); options?.onDismiss?.(); dialog.remove();
  });
  document.body.append(dialog); dialog.showModal();
};
