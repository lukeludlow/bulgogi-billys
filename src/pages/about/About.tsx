import { Heading } from "@/components/catalyst-ui-kit/heading.tsx";
import { Divider } from "@/components/catalyst-ui-kit/divider.tsx";
import { Text } from "@/components/catalyst-ui-kit/text.tsx";

export default function About() {
    return (
        <div className="space-y-3">
            <div className="text-center">
                <Heading>About</Heading>
                <Divider className="mt-3" />
            </div>

            {/* Parent container allowing text flow */}
            <div className="text-left clearfix p-5 pb-20">
                <img
                    src="src/assets/billy-and-mom.jpeg"
                    className="h-80 block mx-auto mb-4 sm:inline sm:float-right sm:ml-4 sm:mr-0 sm:mb-2"
                    alt="billy-and-mom"
                />

                <Text className="text-lg md:text-lg">
                    Bulgogi Billy's is a family restaurant established in 2023
                    using his Mom's famous recipe. Lorem ipsum dolor sit amet,
                    consectetur adipiscing elit. Sed eu ante volutpat, fringilla
                    enim id, sagittis quam. Phasellus luctus odio et diam
                    iaculis, non varius tortor interdum. Quisque ut purus
                    euismod, rutrum libero id, aliquet erat. Etiam eleifend nisi
                    tortor, sit amet dictum felis placerat ac. Aenean tincidunt
                    pellentesque libero in venenatis. Curabitur tristique dui a
                    mi porttitor imperdiet. Pellentesque habitant morbi
                    tristique senectus et netus et malesuada fames ac turpis
                    egestas. Aenean eget ex sed velit porta consequat eget eu
                    enim. Nulla facilisi. Etiam sagittis vehicula iaculis. Nunc
                    nec dui sit amet nisl euismod pellentesque at at arcu. Nunc
                    nec velit dui. Curabitur quam ligula, lobortis a ex eu,
                    convallis accumsan sapien. Nam tempus, neque quis rutrum
                    ullamcorper, nibh tellus gravida sem, at posuere ante arcu
                    et nibh. Suspendisse magna est, varius a gravida eget,
                    scelerisque sit amet ligula.
                </Text>
                <img
                    src="src/assets/cartoon-billy.jpeg"
                    className="h-80 float-left mr-4 my-2"
                    alt="cartoon-billy"
                />
                <Text className="text-lg md:text-lg">
                    Morbi consequat felis ut dolor pellentesque sodales. Sed nec
                    iaculis augue. Quisque euismod ante urna, ac cursus purus
                    laoreet eu. Proin molestie, metus sed molestie mattis, risus
                    purus vulputate sem, a porttitor dolor magna quis erat.
                    Aliquam molestie pharetra elit, quis eleifend augue faucibus
                    eu. Cras elit enim, luctus vulputate nisl a, rutrum ultrices
                    nisi. Praesent sed enim condimentum, ultricies mauris eget,
                    bibendum nisi. Sed vel consequat felis. Duis auctor sit amet
                    mi non posuere. Cras ac felis viverra, tincidunt augue vel,
                    auctor felis. Interdum et malesuada fames ac ante ipsum
                    primis in faucibus.
                </Text>
            </div>
        </div>
    );
}
