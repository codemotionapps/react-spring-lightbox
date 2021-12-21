import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useSpring, useSprings, animated, to, config } from 'react-spring';
import { useGesture } from 'react-use-gesture';
import styled from 'styled-components';
import {
    useDoubleClick,
    imageIsOutOfBounds,
    getTranslateOffsetsFromScale,
    getMagnifierValue
} from '../../utils';

/**
 * Animates pinch-zoom + panning on image using spring physics
 *
 * @param {string} src The source URL of this image
 * @param {string} alt The alt attribute for this image
 * @param {boolean} isCurrentImage True if this image is currently shown in pager, otherwise false
 * @param {function} setDisableDrag Function that can be called to disable dragging in the pager
 * @param {number} pagerHeight Fixed height of the image stage, used to restrict maximum height of images
 * @param {boolean} singleClickToZoom Overrides the default behavior of double clicking causing an image zoom to a single click
 * @param {boolean} pagerIsDragging Indicates parent ImagePager is in a state of dragging, if true click to zoom is disabled
 *
 * @see https://github.com/react-spring/react-use-gesture
 * @see https://github.com/react-spring/react-spring
 */

const supportedImageFiles = [
    'image/webp',
    'image/png',
    'image/jpg',
    'image/jpeg',
    'image/gif',
    'image/svg',
    'image/bmp',
    'webp',
    'png',
    'jpg',
    'jpeg',
    'gif',
    'svg',
    'bmp',
]

const Annotations = ({ annotations, renderAnnotation, store }) => {
    const getScale = () => {
        return { scale: 0.5 };
    };
    const [props, api] = useSprings(annotations.length, getScale);
    useEffect(() => {
        api(getScale);
    }, [api]);

    return (
        <div className="annotations-container">
            {props?.map(({ scale }, i) => {
                const style = {
                    top: `${annotations[i].top}%`,
                    left: `${annotations[i].left}%`,
                    width: 20,
                    height: 20,
                    zIndex: 3,
                    position: 'absolute'
                };
                return (
                    <animated.div
                        className="animated-annotation"
                        style={{
                            transform: to([scale], s => `scale(${s})`)
                        }}
                    >
                        {renderAnnotation({
                            annotation: annotations[i],
                            store,
                            style
                        })}
                    </animated.div>
                );
            })}
        </div>
    );
};

const Image = ({
    image,
    src,
    alt,
    pagerHeight,
    isCurrentImage,
    setDisableDrag,
    singleClickToZoom,
    pagerIsDragging,
    isAnnotating,
    renderAnnotation,
    overlayClick,
    annotations
}) => {
    const imageContainerRef = useRef();
    const [isPanningImage, setIsPanningImage] = useState(false);
    const imageRef = useRef();
    const ratio = image.pictureHeight / image.pictureWidth;
    const defaultImageTransform = () => ({
        scale: 1,
        translateX: 0,
        translateY: 0,
        config: { ...config.default, precision: 0.01 }
    });

    /**
     * Animates scale and translate offsets of Image as they change in gestures
     *
     * @see https://www.react-spring.io/docs/hooks/use-spring
     */
    const [{ scale, translateX, translateY }, set] = useSpring(() => ({
        ...defaultImageTransform(),
        onFrame: f => {
            if (f.scale < 1 || !f.pinching) set(defaultImageTransform);

            // Prevent dragging image out of viewport
            if (f.scale > 1 && imageIsOutOfBounds(imageRef))
                set(defaultImageTransform());
        },
        // Enable dragging in ImagePager if image is at the default size
        onRest: f => {
            if (f.scale === 1) setDisableDrag(false);
        }
    }));

    // Reset scale of this image when dragging to new image in ImagePager
    useEffect(() => {
        if (!isCurrentImage) set(defaultImageTransform);
    });

    /**
     * Update Image scale and translate offsets during pinch/pan gestures
     *
     * @see https://github.com/react-spring/react-use-gesture#usegesture-hook-supporting-multiple-gestures-at-once
     */
    const bind = useGesture(
        {
            onPinch: ({
                movement: [xMovement],
                origin: [touchOriginX, touchOriginY],
                event,
                ctrlKey,
                last,
                cancel
            }) => {
                // Prevent ImagePager from registering isDragging
                setDisableDrag(true);

                // Disable click to zoom during pinch
                if (xMovement && !isPanningImage) setIsPanningImage(true);

                // Don't calculate new translate offsets on final frame
                if (last) {
                    cancel();
                    return;
                }

                // Speed up pinch zoom when using mouse versus touch
                const SCALE_FACTOR = ctrlKey ? 1000 : 250;
                const pinchScale = scale.goal + xMovement / SCALE_FACTOR;
                const pinchDelta = pinchScale - scale.goal;
                const { clientX, clientY } = event;

                // Calculate the amount of x, y translate offset needed to
                // zoom-in to point as image scale grows
                const [
                    newTranslateX,
                    newTranslateY
                ] = getTranslateOffsetsFromScale({
                    imageRef,
                    scale: scale.goal,
                    pinchDelta,
                    currentTranslate: [translateX.goal, translateY.goal],
                    // Use the [x, y] coords of mouse if a trackpad or ctrl + wheel event
                    // Otherwise use touch origin
                    touchOrigin: ctrlKey
                        ? [clientX, clientY]
                        : [touchOriginX, touchOriginY]
                });

                // Restrict the amount of zoom between half and 3x image size
                if (pinchScale < 0.5) set({ scale: 0.5, pinching: true });
                else if (pinchScale > 3.0) set({ scale: 3.0, pinching: true });
                else
                    set({
                        scale: pinchScale,
                        translateX: newTranslateX,
                        translateY: newTranslateY,
                        pinching: true
                    });
            },
            onPinchEnd: () => {
                if (scale.goal > 1) setDisableDrag(true);
                else set(defaultImageTransform);
                setIsPanningImage(false);
            },
            onDragEnd: () =>
                setTimeout(() => {
                    setIsPanningImage(false);
                }, 0),
            onDrag: ({
                movement: [xMovement, yMovement],
                pinching,
                event,
                cancel,
                first,
                memo = { initialTranslateX: 0, initialTranslateY: 0 }
            }) => {
                // Disable click to zoom during drag
                if (xMovement && yMovement && !isPanningImage)
                    setIsPanningImage(true);

                if (event.touches && event.touches.length > 1) return;
                if (pinching || scale.goal <= 1) return;

                // Prevent dragging image out of viewport
                if (scale.goal > 1 && imageIsOutOfBounds(imageRef)) cancel();
                else {
                    if (first) {
                        return {
                            initialTranslateX: translateX.goal,
                            initialTranslateY: translateY.goal
                        };
                    }

                    // Translate image from dragging
                    set({
                        translateX: memo.initialTranslateX + xMovement,
                        translateY: memo.initialTranslateY + yMovement
                    });

                    return memo;
                }
            }
        },
        /**
         * useGesture config
         * @see https://github.com/react-spring/react-use-gesture#usegesture-config
         */
        {
            domTarget: imageRef,
            event: {
                passive: false
            }
        }
    );

    /**
     * @see https://github.com/react-spring/react-use-gesture#adding-gestures-to-dom-nodes
     */
    useEffect(bind, [bind]);

    // Handle click/tap on image
    useDoubleClick({
        [singleClickToZoom ? 'onSingleClick' : 'onDoubleClick']: e => {
            if (pagerIsDragging || isPanningImage) {
                e.stopPropagation();
                return;
            }

            // If tapped while already zoomed-in, zoom out to default scale
            if (scale.goal !== 1) {
                set(defaultImageTransform);
                return;
            }

            // Zoom-in to origin of click on image
            const magnifierValue = ratio > 2 ? getMagnifierValue(ratio) : 1;
            const { clientX: touchOriginX, clientY: touchOriginY } = e;
            const pinchScale = scale.goal + magnifierValue;
            const pinchDelta = pinchScale - scale.goal;

            // Calculate the amount of x, y translate offset needed to
            // zoom-in to point as image scale grows
            const [newTranslateX, newTranslateY] = getTranslateOffsetsFromScale(
                {
                    imageRef,
                    scale: scale.goal,
                    pinchDelta,
                    currentTranslate: [translateX.goal, translateY.goal],
                    touchOrigin: [touchOriginX, touchOriginY]
                }
            );

            // Disable dragging in pager
            setDisableDrag(true);
            set({
                scale: pinchScale,
                translateX: newTranslateX,
                translateY: newTranslateY,
                pinching: true
            });
        },
        ref: imageRef,
        latency: singleClickToZoom ? 0 : 200
    });

    return (
        <>
            <AnimatedImageContainer
                ref={imageContainerRef}
                style={{
                    border: isAnnotating ? '3px solid #fdad1b' : '',
                    cursor: isAnnotating ? 'crosshair' : '',
                    transform: to(
                        [scale, translateX, translateY],
                        (s, x, y) => `translate(${x}px, ${y}px) scale(${s})`
                    ),
                    maxHeight: pagerHeight,
                    ...(isCurrentImage && { willChange: 'transform' })
                }}
                className="image-container"
            >
                {supportedImageFiles.includes(image.fileType) &&
                    isAnnotating
                    && isCurrentImage ? (
                    <Annotations
                        rerender
                        annotations={annotations}
                        isCurrentImage={isCurrentImage}
                        renderAnnotation={renderAnnotation}
                        store={image.imageAnnotationStore}
                    />
                ) : null}
                <AnimatedImage
                    ref={imageRef}
                    className="lightbox-image"
                    style={{
                        cursor: isAnnotating ? 'crosshair' : '',
                        transform: to(
                            [scale, translateX, translateY],
                            (s, x, y) => `translate(${x}px, ${y}px) scale(${s})`
                        ),
                        maxHeight: pagerHeight,
                        ...(isCurrentImage && { willChange: 'transform' })
                    }}
                    src={src}
                    alt={alt}
                    draggable="false"
                    onDragStart={e => {
                        // Disable image ghost dragging in firefox
                        e.preventDefault();
                    }}
                    onClick={e => {
                        // Don't close lighbox when clicking image
                        e.stopPropagation();
                        e.nativeEvent.stopImmediatePropagation();
                        if (isAnnotating) {
                            if (e.ctrlKey || e.metaKey || isPanningImage) {
                                return;
                            }
                            overlayClick(e);
                        }
                    }}
                />
            </AnimatedImageContainer>
        </>
    );
};

Annotations.propTypes = {
    annotations: PropTypes.array.isRequired,
    renderAnnotation: PropTypes.func.isRequired,
    store: PropTypes.object.isRequired
};

Image.propTypes = {
    /* The source URL of this image */
    renderAnnotation: PropTypes.bool.isRequired,
    isAnnotating: PropTypes.bool.isRequired,
    image: PropTypes.object.isRequired,
    src: PropTypes.string.isRequired,
    /* The alt attribute for this image */
    alt: PropTypes.string.isRequired,
    /* True if this image is currently shown in pager, otherwise false */
    isCurrentImage: PropTypes.bool.isRequired,
    /* Function that can be called to disable dragging in the pager */
    setDisableDrag: PropTypes.func.isRequired,
    /* Fixed height of the image stage, used to restrict maximum height of images */
    pagerHeight: PropTypes.number.isRequired,
    /* Overrides the default behavior of double clicking causing an image zoom to a single click */
    singleClickToZoom: PropTypes.bool.isRequired,
    /* Indicates parent ImagePager is in a state of dragging, if true click to zoom is disabled */
    pagerIsDragging: PropTypes.bool.isRequired,
    overlayClick: PropTypes.func.isRequired,
    annotations: PropTypes.object.isRequired
};

export default Image;

const AnimatedImageContainer = styled(animated.div)`
    z-index: 1200;
    width: auto;
    max-width: 100%;
    user-select: none;
    ::selection {
        background: none;
    }
`;

const AnimatedImage = styled(animated.img)`
    width: auto;
    max-width: 100%;
    user-select: none;
    ::selection {
        background: none;
    }
`;
