import Button from "./Button";

interface Props {
  onClose: () => void;
  /** Botão para ir à edição (só para quem pode editar). */
  onEditar?: () => void;
}

/** Rodapé dos modais de cadastro no modo "só visualização": Fechar e, se pode, Editar. */
export default function RodapeSoLeitura({ onClose, onEditar }: Props) {
  return (
    <div className="flex justify-end gap-3">
      <Button variant="secondary" onClick={onClose}>
        Fechar
      </Button>
      {onEditar && (
        <Button variant="primary" onClick={onEditar}>
          Editar
        </Button>
      )}
    </div>
  );
}
