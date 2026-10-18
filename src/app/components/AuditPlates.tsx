interface AuditPlatesProps {
  readonly masterUrl: string;
  readonly contactSheetUrl: string;
}

export function AuditPlates({ masterUrl, contactSheetUrl }: AuditPlatesProps) {
  return (
    <div className="audit__plates">
      <figure>
        <figcaption>identity master (K0)</figcaption>
        <img src={masterUrl} alt="Persona identity master plate" data-testid="audit__master" loading="lazy" />
      </figure>
      <figure>
        <figcaption>16-phase contact sheet (1×)</figcaption>
        <img src={contactSheetUrl} alt="16-phase contact sheet" data-testid="audit__contact-sheet" loading="lazy" />
      </figure>
    </div>
  );
}
