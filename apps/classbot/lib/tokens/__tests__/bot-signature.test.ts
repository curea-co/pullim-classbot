import { botSignature } from '../bot-signature';
import { palette } from '../palette';

describe('botSignature', () => {
  it('maps math subject to the palette math signature (no inline hex)', () => {
    const sig = botSignature({ subject: '미적분' });
    expect(sig.kind).toBe('math');
    expect(sig.hex).toBe(palette.botSig.math.hex);
    expect(sig.inkLight).toBe(palette.botSig.math.inkLight);
  });
  it('falls back to math palette entry (not an off-palette hex)', () => {
    const sig = botSignature(null);
    expect(sig.hex).toBe(palette.botSig.math.hex);
  });
  it('resolves by id', () => {
    expect(botSignature({ id: 'cb_002' }).kind).toBe('english');
  });
});
