/**
 * Anti-spam honeypot: hidden from people, filled in by bots. Web3Forms drops
 * any submission whose `botcheck` field isn't empty.
 */
export default function HoneypotField() {
    return (
        <input
            type="text"
            name="botcheck"
            className="hidden"
            style={{ display: "none" }}
            tabIndex={-1}
            autoComplete="off"
        />
    );
}
