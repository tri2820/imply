import { Color, colorClasses, probToPercent } from "~/utils";

export default function OptionItem(props: {
  id: string;
  label: string;
  prob?: number;
  color: Color;
  onClick?: (id: string) => void;
}) {
  //   const checked = () => props.value === props.id;
  const colorClass = () => colorClasses.background[props.color];

  return (
    <div
      onClick={() => {
        props.onClick?.(props.id);
      }}
      class="group relative p-2 flex items-center space-x-2 border rounded border-neutral-800 bg-white/5 flex-1 cursor-pointer h-12"
    >
      <div
        // data-checked={checked()}
        class={"absolute top-0 left-0 h-full  transition " + colorClass()}
        style={{
          width: probToPercent(props.prob),
        }}
      />

      <div class="flex items-center space-x-2 flex-1 z-10 text-sm">
        <div class="flex-1 line-clamp-1">{props.label}</div>
        <div>{probToPercent(props.prob)}</div>
      </div>

      {/* hidden group-hover:block */}
      {/* <div class="max-w-0 group-hover:max-w-[1000px] overflow-hidden transition-all ease-in-out duration-500">
        <button class="px-1.5 py-1 bg-[#360ccc]/80 hover:bg-[#360ccc] transition-all text-xs rounded  drop-shadow-lg">
          Predict
        </button>
      </div> */}
    </div>
  );
}
