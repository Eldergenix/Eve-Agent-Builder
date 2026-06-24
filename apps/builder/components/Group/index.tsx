import Icon from "@/components/Icon";

type Props = {
  title: string;
  rightContent?: React.ReactNode;
  withoutAddButton?: boolean;
  onAdd?: () => void;
  children?: React.ReactNode;
};

const Group = ({ title, rightContent, withoutAddButton, onAdd, children }: Props) => (
  <div className="border-t border-s-01 first:border-t-0">
    <div className="flex justify-between items-center min-h-12 px-4 py-3 text-body-md-str">
      {title}
      {rightContent ? (
        rightContent
      ) : withoutAddButton ? null : (
        <button
          className="btn-icon size-6"
          type="button"
          aria-label={`Add ${title}`}
          onClick={onAdd}
          disabled={!onAdd}
        >
          <Icon className="!size-4" name="plus" aria-hidden="true" />
        </button>
      )}
    </div>
    {children && <div className="p-4 pt-0">{children}</div>}
  </div>
);

export default Group;
